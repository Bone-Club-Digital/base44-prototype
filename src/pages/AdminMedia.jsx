
import React, { useState, useEffect } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { MediaFile } from '@/entities/MediaFile';
import { UploadFile } from '@/integrations/Core';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, Upload, Trash2, Copy, Image, Video, FileText,
  Download, Eye, Search, Filter, Grid3X3, List, Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';

const MediaPreview = ({ file, getFileIcon }) => {
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
  }, [file.file_url]);

  const isSvg = file.file_type === 'image/svg+xml' || (file.filename && file.filename.toLowerCase().endsWith('.svg'));
  const isImage = file.file_type.startsWith('image/') && !isSvg;

  const renderFallback = () => (
    <div className="flex flex-col items-center justify-center h-full text-gray-500">
      {isSvg ? (
        <>
          <Image className="w-8 h-8" />
          <span className="text-xs mt-2">SVG</span>
        </>
      ) : (
        <>
          {getFileIcon(file.file_type)}
          <span className="text-xs mt-2">{file.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}</span>
        </>
      )}
    </div>
  );

  if (isSvg) {
    return renderFallback();
  }

  if (isImage) {
    if (loadError) return renderFallback();
    return (
      <img
        src={file.file_url}
        alt={file.alt_text || file.filename}
        className="w-full h-full object-contain"
        onError={() => setLoadError(true)}
      />
    );
  }

  return renderFallback();
};


export default function AdminMediaPage() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const [mediaFiles, setMediaFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [uploadData, setUploadData] = useState({
    filename: '',
    category: 'general',
    alt_text: ''
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate(createPageUrl('Home'));
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchMediaFiles();
    }
  }, [user]);

  useEffect(() => {
    // Filter files based on search term and category
    let filtered = mediaFiles;
    
    if (searchTerm) {
      filtered = filtered.filter(file => 
        file.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (file.alt_text && file.alt_text.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(file => file.category === categoryFilter);
    }
    
    setFilteredFiles(filtered);
  }, [mediaFiles, searchTerm, categoryFilter]);

  const fetchMediaFiles = async () => {
    setMediaLoading(true);
    try {
      const files = await MediaFile.list();
      setMediaFiles(files.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error('Error fetching media files:', error);
      alert(`Failed to fetch media files: ${error.message}`);
    } finally {
      setMediaLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB.');
      return;
    }

    if (!uploadData.filename) {
      setUploadData(prev => ({...prev, filename: file.name}));
    }

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      
      await MediaFile.create({
        filename: uploadData.filename || file.name,
        file_url: file_url,
        file_type: file.type,
        file_size: file.size,
        category: uploadData.category,
        alt_text: uploadData.alt_text,
        uploaded_by: user.id
      });

      setShowUploadModal(false);
      setUploadData({ filename: '', category: 'general', alt_text: '' });
      await fetchMediaFiles();
      alert('File uploaded successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(`Failed to upload file: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (fileId, filename) => {
    if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) return;
    
    try {
      await MediaFile.delete(fileId);
      await fetchMediaFiles();
      alert('File deleted successfully.');
    } catch (error) {
      console.error('Error deleting file:', error);
      alert(`Failed to delete file: ${error.message}`);
    }
  };

  const copyToClipboard = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      alert('URL copied to clipboard! You can paste this URL to use the file.');
    } catch (error) {
      console.error('Failed to copy URL:', error);
      alert('Failed to copy URL to clipboard.');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (fileType.startsWith('video/')) return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getCategoryColor = (category) => {
    const colors = {
      logo: 'bg-blue-100 text-blue-800',
      banner: 'bg-purple-100 text-purple-800',
      avatar: 'bg-green-100 text-green-800',
      general: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.general;
  };

  if (loading || mediaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 border-4 border-[#5a3217] animate-spin mx-auto mb-4" />
          <p className="main-text">Loading media files...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#5a3217', color: '#e5e4cd' }}>
          <DialogHeader>
            <DialogTitle className="text-xl uppercase" style={{ color: '#e5e4cd' }}>
              Upload New File
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="file-name" className="text-bone-color">Display Name</Label>
              <Input 
                id="file-name" 
                value={uploadData.filename} 
                onChange={(e) => setUploadData({...uploadData, filename: e.target.value})} 
                placeholder="Enter display name for file" 
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50" 
              />
            </div>
            <div>
              <Label htmlFor="file-category" className="text-bone-color">Category</Label>
              <Select value={uploadData.category} onValueChange={(value) => setUploadData({...uploadData, category: value})}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="logo">Logo</SelectItem>
                  <SelectItem value="banner">Banner</SelectItem>
                  <SelectItem value="avatar">Avatar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="file-alt" className="text-bone-color">Alt Text (optional)</Label>
              <Input 
                id="file-alt" 
                value={uploadData.alt_text} 
                onChange={(e) => setUploadData({...uploadData, alt_text: e.target.value})} 
                placeholder="Describe the image for accessibility" 
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50" 
              />
            </div>
            <div>
              <Label htmlFor="file-input" className="text-bone-color">Select File (Max 10MB)</Label>
              <input 
                id="file-input" 
                type="file" 
                onChange={handleFileUpload} 
                className="hidden" 
                disabled={isUploading}
                accept="image/*,video/*,.pdf,.doc,.docx,.txt,.svg"
              />
              <label 
                htmlFor="file-input" 
                className="flex items-center gap-2 px-4 py-2 bg-[#f26222] text-white rounded-md cursor-pointer hover:opacity-90 mt-2 w-full justify-center"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isUploading ? 'Uploading...' : 'Choose File'}
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setShowUploadModal(false)} 
              style={{ backgroundColor: '#e5e4cd', color: '#5a3217' }} 
              disabled={isUploading}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Link to={createPageUrl("Admin")} className="flex items-center gap-2 hover:opacity-70 transition-colors" style={{ color: '#5a3217' }}>
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Admin</span>
            </Link>
            <Button onClick={() => setShowUploadModal(true)} style={{ backgroundColor: '#f26222', color: 'white' }} className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload New File
            </Button>
          </div>

          <h1 className="text-4xl font-bold main-text mb-8">Media Management</h1>

          {/* Filters and Search */}
          <Card className="tool-card-bg border-0 elegant-shadow mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 main-text" />
                  <Input
                    placeholder="Search files..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 main-text" />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="logo">Logo</SelectItem>
                      <SelectItem value="banner">Banner</SelectItem>
                      <SelectItem value="avatar">Avatar</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1 border rounded-lg p-1">
                  <Button
                    size="sm"
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('grid')}
                    className="h-8 w-8 p-0"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('list')}
                    className="h-8 w-8 p-0"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>

                <div className="ml-auto">
                  <span className="text-sm main-text opacity-70">
                    {filteredFiles.length} of {mediaFiles.length} files
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {filteredFiles.length === 0 ? (
            <Card className="tool-card-bg border-0 elegant-shadow text-center py-12">
              <CardContent>
                <Image className="w-16 h-16 main-text opacity-50 mx-auto mb-4" />
                <h3 className="text-xl font-bold main-text mb-2">
                  {mediaFiles.length === 0 ? 'No Files Yet' : 'No Matching Files'}
                </h3>
                <p className="main-text opacity-70">
                  {mediaFiles.length === 0 
                    ? 'Upload your first file to get started.' 
                    : 'Try adjusting your search or filter criteria.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
              {filteredFiles.map(file => {
                const isSvg = file.file_type === 'image/svg+xml' || (file.filename && file.filename.toLowerCase().endsWith('.svg'));
                
                return (
                  <Card key={file.id} className={`tool-card-bg border-0 elegant-shadow ${viewMode === 'list' ? 'flex-row' : ''}`}>
                    <CardContent className={`p-4 ${viewMode === 'list' ? 'flex items-center space-x-4' : ''}`}>
                      {viewMode === 'grid' ? (
                        <>
                          <div className="aspect-square mb-4 bg-white rounded-lg overflow-hidden flex items-center justify-center p-2">
                            <MediaPreview file={file} getFileIcon={getFileIcon} />
                          </div>
                          <div className="space-y-2">
                            <h3 className="font-bold main-text text-sm truncate" title={file.filename}>{file.filename}</h3>
                            <div className="flex flex-wrap gap-1">
                              <Badge className={`text-xs ${getCategoryColor(file.category)}`}>{file.category}</Badge>
                              <Badge variant="outline" className="text-xs">{formatFileSize(file.file_size)}</Badge>
                              {isSvg && <Badge className="text-xs bg-purple-100 text-purple-800">SVG</Badge>}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <Button size="sm" variant="outline" onClick={() => copyToClipboard(file.file_url)} className="flex-1 text-xs">
                                <Copy className="w-3 h-3 mr-1" />
                                Copy URL
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => {
                                // For SVGs, inform user about download behavior
                                if (file.file_type === 'image/svg+xml' || file.filename.toLowerCase().endsWith('.svg')) {
                                  alert('Note: This will download the SVG file due to server settings. You can then open it locally to view.');
                                }
                                window.open(file.file_url, '_blank');
                              }} className="flex-1 text-xs">
                                {file.file_type === 'image/svg+xml' || file.filename.toLowerCase().endsWith('.svg') ? (
                                  <Download className="w-3 h-3 mr-1" />
                                ) : (
                                  <Eye className="w-3 h-3 mr-1" />
                                )}
                                {file.file_type === 'image/svg+xml' || file.filename.toLowerCase().endsWith('.svg') ? 'Download' : 'View'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDeleteFile(file.id, file.filename)} className="text-red-600 hover:text-red-700 text-xs">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-white rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 p-1">
                             <MediaPreview file={file} getFileIcon={getFileIcon} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold main-text">{file.filename}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={`text-xs ${getCategoryColor(file.category)}`}>{file.category}</Badge>
                              <Badge variant="outline" className="text-xs">{formatFileSize(file.file_size)}</Badge>
                              <span className="text-xs main-text opacity-60">{file.file_type}</span>
                              {isSvg && <Badge className="text-xs bg-purple-100 text-purple-800">SVG</Badge>}
                            </div>
                            <div className="text-xs main-text opacity-60 mt-1">
                              Uploaded {new Date(file.created_date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button size="sm" variant="outline" onClick={() => window.open(file.file_url, '_blank')}>
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard(file.file_url)}>
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteFile(file.id, file.filename)} className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
