
import React, { useState, useEffect } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ProfileAvatar } from '@/entities/ProfileAvatar';
import { UploadFile } from '@/integrations/Core';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, Upload, Trash2, Edit, Save, X, Image,
  Plus, Eye, EyeOff, Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AvatarCategory } from '@/entities/AvatarCategory';

export default function AdminAvatarsPage() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const [avatars, setAvatars] = useState([]);
  const [avatarCategories, setAvatarCategories] = useState([]);
  const [avatarsLoading, setAvatarsLoading] = useState(true);
  const [editingAvatar, setEditingAvatar] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    name: '',
    category: 'classic',
    sort_order: 0
  });
  const [isUploading, setIsUploading] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate(createPageUrl('Home'));
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setAvatarsLoading(true);
    try {
      // Fetch avatars first
      const avatarsResult = await ProfileAvatar.list();
      setAvatars(avatarsResult.sort((a, b) => a.sort_order - b.sort_order));

      // Now handle categories, with one-time seeding
      let categoriesResult = await AvatarCategory.list();
      if (categoriesResult.length === 0) {
        const initialCategories = ['classic', 'animals', 'fantasy', 'sports', 'seasonal'];
        await AvatarCategory.bulkCreate(initialCategories.map(name => ({ name })));
        categoriesResult = await AvatarCategory.list(); // Re-fetch to get IDs
      }
      setAvatarCategories(categoriesResult);

    } catch (error) {
      console.error('Error fetching data:', error);
      alert(`Failed to fetch data: ${error.message}`);
    } finally {
      setAvatarsLoading(false);
    }
  };

  const getAvailableCategories = () => {
    // Returns only the names of the categories from the state
    return avatarCategories.map(c => c.name);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'image/png') {
      alert('Please select a PNG file only.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB.');
      return;
    }
    if (!uploadData.name.trim()) {
      alert('Please enter a name for the avatar.');
      return;
    }

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      await ProfileAvatar.create({
        name: uploadData.name.trim(),
        file_url: file_url,
        category: uploadData.category,
        sort_order: parseInt(uploadData.sort_order) || 0
      });
      setShowUploadModal(false);
      setUploadData({ name: '', category: 'classic', sort_order: 0 });
      await fetchData();
      alert('Avatar uploaded successfully!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert(`Failed to upload avatar: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleActive = async (avatarId, currentStatus) => {
    try {
      await ProfileAvatar.update(avatarId, { is_active: !currentStatus });
      await fetchData();
    } catch (error) {
      console.error('Error updating avatar status:', error);
      alert(`Failed to update avatar status: ${error.message}`);
    }
  };

  const handleDelete = async (avatarId, avatarName) => {
    if (!confirm(`Are you sure you want to delete the "${avatarName}" avatar?`)) return;
    try {
      await ProfileAvatar.delete(avatarId);
      await fetchData();
      alert('Avatar deleted successfully.');
    } catch (error) {
      console.error('Error deleting avatar:', error);
      alert(`Failed to delete avatar: ${error.message}`);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingAvatar) return;
    try {
      await ProfileAvatar.update(editingAvatar.id, {
        name: editingAvatar.name.trim(),
        category: editingAvatar.category,
        sort_order: parseInt(editingAvatar.sort_order) || 0
      });
      setEditingAvatar(null);
      await fetchData();
      alert('Avatar updated successfully!');
    } catch (error) {
      console.error('Error updating avatar:', error);
      alert(`Failed to update avatar: ${error.message}`);
    }
  };

  const handleAddCategory = async () => {
    const newCatName = newCategory.trim();
    if (!newCatName) return;

    // Check against existing categories by name
    const allCategoryNames = getAvailableCategories().map(c => c.toLowerCase());
    if (allCategoryNames.includes(newCatName.toLowerCase())) {
        alert(`Category "${newCatName}" already exists.`);
        return;
    }

    setIsSubmitting(true);
    try {
      await AvatarCategory.create({ name: newCatName });
      await fetchData();
      if (showUploadModal) {
        setUploadData({...uploadData, category: newCatName});
      }
      setNewCategory('');
      setShowCategoryInput(false); // Hide input after adding
    } catch (e) {
      console.error("Failed to add category:", e);
      alert(`Could not save new category. Error: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveCategory = async (categoryToRemove) => {
    // categoryToRemove is the category object {id, name}
    const avatarsInCategory = avatars.filter(avatar => avatar.category === categoryToRemove.name);

    if (avatarsInCategory.length > 0) {
      alert(`Cannot remove category "${categoryToRemove.name}" because it contains ${avatarsInCategory.length} avatar(s). Please reassign or delete these avatars first.`);
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete the "${categoryToRemove.name}" category? This action cannot be undone.`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await AvatarCategory.delete(categoryToRemove.id);
      await fetchData(); // Refresh both avatars and categories
      alert(`Category "${categoryToRemove.name}" removed successfully.`);
      // If the removed category was selected in upload modal, reset to 'classic'
      if (uploadData.category === categoryToRemove.name) {
        setUploadData(prev => ({...prev, category: 'classic'}));
      }
      // If currently editing an avatar in this category, clear editing state
      if (editingAvatar && editingAvatar.category === categoryToRemove.name) {
          setEditingAvatar(null);
      }
    } catch (error) {
      console.error("Failed to remove category:", error);
      alert(`Could not remove category. Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAvatarCountInCategory = (categoryName) => {
    return avatars.filter(avatar => avatar.category === categoryName).length;
  };

  const getCategoryColor = (category) => {
    const colors = {
      classic: 'bg-blue-100 text-blue-800',
      animals: 'bg-green-100 text-green-800',
      fantasy: 'bg-purple-100 text-purple-800',
      sports: 'bg-orange-100 text-orange-800',
      seasonal: 'bg-red-100 text-red-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading || avatarsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#5a3217] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="main-text">Loading avatars...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#5a3217', color: '#e5e4cd' }}>
          <DialogHeader>
            <DialogTitle className="text-xl uppercase" style={{ color: '#e5e4cd' }}>
              Manage Categories
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <h4 className="font-semibold text-bone-color mb-2">All Categories:</h4>
              <div className="space-y-2">
                {avatarCategories.map(category => {
                  const avatarCount = getAvatarCountInCategory(category.name);

                  return (
                    <div key={category.id} className="flex items-center justify-between p-2 bg-white/10 rounded">
                      <div>
                        <span className="text-bone-color font-medium">{category.name}</span>
                        <span className="text-xs text-bone-color-faded ml-2">
                          ({avatarCount} avatars)
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveCategory(category)}
                        disabled={avatarCount > 0 || isSubmitting}
                        className="text-red-400 hover:text-red-600 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  );
                })}

                {avatarCategories.length === 0 && (
                  <p className="text-sm text-bone-color-faded">No categories created yet.</p>
                )}
              </div>
            </div>

            <div className="border-t border-white/20 pt-4">
              <h4 className="font-semibold text-bone-color mb-2">Add New Category:</h4>
              <div className="flex gap-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Enter category name"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                  disabled={isSubmitting}
                />
                <Button
                  onClick={handleAddCategory}
                  size="sm"
                  style={{ backgroundColor: '#007e81', color: 'white' }}
                  disabled={!newCategory.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setShowCategoryManager(false);
                setNewCategory('');
              }}
              style={{ backgroundColor: '#e5e4cd', color: '#5a3217' }}
              disabled={isSubmitting}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#5a3217', color: '#e5e4cd' }}>
          <DialogHeader>
            <DialogTitle className="text-xl uppercase" style={{ color: '#e5e4cd' }}>
              Upload New Avatar
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="avatar-name" className="text-bone-color">Avatar Name</Label>
              <Input id="avatar-name" value={uploadData.name} onChange={(e) => setUploadData({...uploadData, name: e.target.value})} placeholder="e.g., Knight, Dragon, Crown" className="bg-white/10 border-white/20 text-white placeholder:text-white/50" />
            </div>
            <div>
              <Label htmlFor="avatar-category" className="text-bone-color">Category</Label>
              <div className="space-y-2">
                <Select value={uploadData.category} onValueChange={(value) => setUploadData({...uploadData, category: value})}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {getAvailableCategories().map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showCategoryInput ? (
                  <div className="flex gap-2">
                    <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Enter new category" className="bg-white/10 border-white/20 text-white placeholder:text-white/50" onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()} disabled={isSubmitting}/>
                    <Button onClick={handleAddCategory} size="sm" style={{ backgroundColor: '#007e81', color: 'white' }} disabled={!newCategory.trim() || isSubmitting}>
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                    </Button>
                    <Button onClick={() => {setShowCategoryInput(false); setNewCategory('');}} size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">Cancel</Button>
                  </div>
                ) : (
                  <Button onClick={() => setShowCategoryInput(true)} size="sm" variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20">+ Add New Category</Button>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="avatar-sort" className="text-bone-color">Sort Order</Label>
              <Input id="avatar-sort" type="number" value={uploadData.sort_order} onChange={(e) => setUploadData({...uploadData, sort_order: e.target.value})} placeholder="0" className="bg-white/10 border-white/20 text-white placeholder:text-white/50" />
            </div>
            <div>
              <Label htmlFor="avatar-file" className="text-bone-color">PNG File (Max 2MB)</Label>
              <input id="avatar-file" type="file" accept=".png" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
              <label htmlFor="avatar-file" className="flex items-center gap-2 px-4 py-2 bg-[#f26222] text-white rounded-md cursor-pointer hover:opacity-90 mt-2 w-full justify-center">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isUploading ? 'Uploading...' : 'Choose PNG File'}
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowUploadModal(false)} style={{ backgroundColor: '#e5e4cd', color: '#5a3217' }} disabled={isUploading}>Cancel</Button>
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
            <div className="flex gap-2">
              <Button onClick={() => setShowCategoryManager(true)} variant="outline" className="flex items-center gap-2 bg-white/20 text-bone-color hover:bg-white/30"><Edit className="w-4 h-4" />Manage Categories</Button>
              <Button onClick={() => setShowUploadModal(true)} style={{ backgroundColor: '#f26222', color: 'white' }} className="flex items-center gap-2"><Plus className="w-4 h-4" />Upload New Avatar</Button>
            </div>
          </div>
          <h1 className="text-4xl font-bold main-text mb-8">Profile Avatars</h1>
          <Card className="tool-card-bg border-0 elegant-shadow mb-6">
            <CardContent className="p-4">
              <p className="main-text">Upload PNG files that users can select as their profile pictures. Avatars should be square (1:1 aspect ratio) and no larger than 2MB.</p>
              {getAvailableCategories().length > 0 && (
                <div className="mt-3">
                  <p className="text-sm main-text opacity-70 mb-2">Available Categories:</p>
                  <div className="flex flex-wrap gap-2">
                    {getAvailableCategories().map(category => (
                      <Badge key={category} className={`${getCategoryColor(category)} text-xs`}>{category} ({getAvatarCountInCategory(category)})</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {avatars.length === 0 ? (
            <Card className="tool-card-bg border-0 elegant-shadow text-center py-12">
              <CardContent>
                <Image className="w-16 h-16 main-text opacity-50 mx-auto mb-4" />
                <h3 className="text-xl font-bold main-text mb-2">No Avatars Yet</h3>
                <p className="main-text opacity-70">Upload your first avatar to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {avatars.map(avatar => (
                <Card key={avatar.id} className="tool-card-bg border-0 elegant-shadow">
                  <CardContent className="p-4">
                    <div className="aspect-square mb-4 bg-white rounded-lg overflow-hidden">
                      <img src={avatar.file_url} alt={avatar.name} className="w-full h-full object-cover" />
                    </div>
                    {editingAvatar?.id === avatar.id ? (
                      <div className="space-y-3">
                        <Input value={editingAvatar.name} onChange={(e) => setEditingAvatar({...editingAvatar, name: e.target.value})} className="text-sm" />
                        <Select value={editingAvatar.category} onValueChange={(value) => setEditingAvatar({...editingAvatar, category: value})}>
                          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {getAvailableCategories().map(category => (
                              <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input type="number" value={editingAvatar.sort_order} onChange={(e) => setEditingAvatar({...editingAvatar, sort_order: e.target.value})} placeholder="Sort order" className="text-sm" />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit} style={{ backgroundColor: '#007e81', color: 'white' }}><Save className="w-3 h-3" /></Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingAvatar(null)}><X className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <h3 className="font-bold main-text text-sm truncate">{avatar.name}</h3>
                        <div className="flex flex-wrap gap-1">
                          <Badge className={`text-xs ${getCategoryColor(avatar.category)}`}>{avatar.category}</Badge>
                          {!avatar.is_active && (<Badge variant="outline" className="text-xs opacity-50">Hidden</Badge>)}
                        </div>
                        <div className="text-xs main-text opacity-60">Order: {avatar.sort_order}</div>
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="outline" onClick={() => setEditingAvatar(avatar)} className="flex-1"><Edit className="w-3 h-3" /></Button>
                          <Button size="sm" variant="outline" onClick={() => handleToggleActive(avatar.id, avatar.is_active)} className="flex-1">{avatar.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}</Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(avatar.id, avatar.name)} className="text-red-600 hover:text-red-700 flex-1"><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
