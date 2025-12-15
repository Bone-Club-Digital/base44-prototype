
import React, { useState, useEffect } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { HomeBanner } from '@/entities/HomeBanner';
import { UploadFile } from '@/integrations/Core';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, Trash2, Edit, Plus, Eye, EyeOff, Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const colorPalette = {
  tobacco: '#5a3217',
  tangerine: '#f26222',
  bone: '#e5e4cd',
  teal: '#007e81',
  turquoise: '#9fd3ba',
};

const alignmentClasses = {
  left: 'justify-start items-center text-left',
  center: 'justify-center items-center text-center',
  right: 'justify-end items-center text-right',
};

const initialFormData = {
  name: '', alt_text: '', sort_order: 0, image_url: '',
  title: '', strapline: '', button_text: '', button_link: '',
  content_alignment: 'left', title_color: 'tobacco', strapline_color: 'tobacco',
  button_bg_color: 'tangerine', button_text_color: 'bone',
};

const FormColorSelect = ({ label, value, onChange }) => (
  <div>
    <Label className="text-bone-color">{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-white/10 border-white/20 text-white">
        <SelectValue placeholder="Select color" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(colorPalette).map(([name, hex]) => (
          <SelectItem key={name} value={name}>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: hex }} />
              <span>{name.charAt(0).toUpperCase() + name.slice(1)}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default function AdminHomeBannersPage() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate(createPageUrl('Home'));
    } else if (user) {
      fetchBanners();
    }
  }, [user, loading, navigate]);

  const fetchBanners = async () => {
    setBannersLoading(true);
    try {
      const bannersResult = await HomeBanner.list();
      setBanners(bannersResult.sort((a, b) => a.sort_order - b.sort_order));
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setBannersLoading(false);
    }
  };

  const handleEditClick = (banner) => {
    setEditingBanner(banner);
    setFormData({ ...initialFormData, ...banner });
    setShowEditModal(true);
  };
  
  const handleAddNewClick = () => {
    setEditingBanner(null);
    setFormData(initialFormData);
    setShowEditModal(true);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, image_url: file_url }));
    } catch (error) {
      alert(`Image upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleFormChange = (field, value) => {
    setFormData(prev => ({...prev, [field]: value}));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const dataToSave = { ...formData, sort_order: parseInt(formData.sort_order) || 0 };
    try {
      if (editingBanner) {
        await HomeBanner.update(editingBanner.id, dataToSave);
      } else {
        await HomeBanner.create(dataToSave);
      }
      setShowEditModal(false);
      await fetchBanners();
    } catch (error) {
      alert(`Failed to save banner: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (bannerId) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      await HomeBanner.delete(bannerId);
      await fetchBanners();
    } catch (error) {
      alert(`Failed to delete banner: ${error.message}`);
    }
  };

  const handleToggleActive = async (banner) => {
    try {
      await HomeBanner.update(banner.id, { is_active: !banner.is_active });
      await fetchBanners();
    } catch (error) {
      alert(`Failed to update status: ${error.message}`);
    }
  };
  
  const handleReorder = async (banner, direction) => {
    const currentIndex = banners.findIndex(b => b.id === banner.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;
    const targetBanner = banners[targetIndex];
    try {
      await Promise.all([
        HomeBanner.update(banner.id, { sort_order: targetBanner.sort_order }),
        HomeBanner.update(targetBanner.id, { sort_order: banner.sort_order })
      ]);
      await fetchBanners();
    } catch (error) {
      alert(`Failed to reorder banners: ${error.message}`);
    }
  };

  if (bannersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <Loader2 className="w-12 h-12 text-tobacco animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-6xl" style={{ backgroundColor: '#5a3217', color: '#e5e4cd' }}>
          <DialogHeader>
            <DialogTitle className="text-2xl uppercase">
              {editingBanner ? 'Edit Home Banner' : 'Add New Home Banner'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4 max-h-[80vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-bone-color">Banner Name (for admin)</Label>
                  <Input value={formData.name} onChange={e => handleFormChange('name', e.target.value)} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <Label className="text-bone-color">Sort Order</Label>
                  <Input type="number" value={formData.sort_order} onChange={e => handleFormChange('sort_order', e.target.value)} className="bg-white/10 border-white/20 text-white" />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label className="text-bone-color">Banner Image (no text)</Label>
                    <Input type="file" accept="image/*" onChange={handleFileUpload} disabled={isUploading} className="bg-white/10 border-white/20 text-white file:text-white" />
                    {isUploading && <Loader2 className="w-4 h-4 animate-spin mt-2" />}
                    {formData.image_url && <img src={formData.image_url} alt="preview" className="mt-2 rounded-md max-h-32"/>}
                </div>
                <div>
                    <Label className="text-bone-color">Alt Text</Label>
                    <Textarea value={formData.alt_text} onChange={e => handleFormChange('alt_text', e.target.value)} className="bg-white/10 border-white/20 text-white" />
                </div>
            </div>

            <div>
              <Label className="text-bone-color">Live Preview</Label>
              <div className="relative w-[90%] mx-auto bg-black/20 rounded-md overflow-hidden mt-2 border border-white/20" style={{ aspectRatio: '3.44 / 1' }}>
                {formData.image_url ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${formData.image_url})` }}
                  >
                    <div className={`absolute inset-0 flex items-center p-4 md:p-8 
                      ${formData.content_alignment === 'left' ? 'justify-start text-left' : ''}
                      ${formData.content_alignment === 'center' ? 'justify-center text-center' : ''}
                      ${formData.content_alignment === 'right' ? 'justify-end text-right' : ''}
                    `}>
                      <div className="w-full md:w-2/3 space-y-2">
                        {formData.title && (
                          <h2 
                            className="text-2xl md:text-3xl font-bold uppercase" 
                            style={{ fontFamily: 'Abolition, Oswald, sans-serif', color: colorPalette[formData.title_color] || '#ffffff' }}
                          >
                            {formData.title}
                          </h2>
                        )}
                        {formData.strapline && (
                          <p 
                            className="text-base md:text-lg" 
                            style={{ 
                              color: colorPalette[formData.strapline_color] || colorPalette.tobacco
                            }}
                          >
                            {formData.strapline}
                          </p>
                        )}
                        {formData.button_text && formData.button_link && (
                          <div className="pt-2">
                            <Button 
                              type="button" 
                              style={{ 
                                backgroundColor: colorPalette[formData.button_bg_color] || colorPalette.tangerine, 
                                color: colorPalette[formData.button_text_color] || colorPalette.bone
                              }}
                              className="uppercase font-bold"
                              asChild
                            >
                              <Link to="#">{formData.button_text}</Link>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-bone-color/50">Upload an image to see preview</p>
                  </div>
                )}
              </div>
            </div>

            <hr className="border-white/20 my-6"/>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-bone-color">Title</Label>
                  <Input value={formData.title} onChange={e => handleFormChange('title', e.target.value)} className="bg-white/10 border-white/20 text-white" />
                </div>
                <FormColorSelect label="Title Color" value={formData.title_color} onChange={v => handleFormChange('title_color', v)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-bone-color">Strapline</Label>
                  <Input value={formData.strapline} onChange={e => handleFormChange('strapline', e.target.value)} className="bg-white/10 border-white/20 text-white" />
                </div>
                <FormColorSelect label="Strapline Color" value={formData.strapline_color} onChange={v => handleFormChange('strapline_color', v)} />
            </div>

            <hr className="border-white/20 my-6"/>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-bone-color">Button Text</Label>
                  <Input value={formData.button_text} onChange={e => handleFormChange('button_text', e.target.value)} className="bg-white/10 border-white/20 text-white" />
                </div>
                 <div>
                  <Label className="text-bone-color">Button Link</Label>
                  <Input value={formData.button_link} onChange={e => handleFormChange('button_link', e.target.value)} placeholder="/Shop" className="bg-white/10 border-white/20 text-white" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormColorSelect label="Button Background Color" value={formData.button_bg_color} onChange={v => handleFormChange('button_bg_color', v)} />
                <FormColorSelect label="Button Text Color" value={formData.button_text_color} onChange={v => handleFormChange('button_text_color', v)} />
            </div>
            
            <hr className="border-white/20 my-6"/>
            
            <div>
              <Label className="text-bone-color">Content Alignment</Label>
              <Select value={formData.content_alignment} onValueChange={v => handleFormChange('content_alignment', v)}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => setShowEditModal(false)} style={{ backgroundColor: '#e5e4cd', color: '#5a3217' }} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" style={{ backgroundColor: '#f26222', color: 'white' }} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Save Banner'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Link to={createPageUrl("Admin")} className="flex items-center gap-2 hover:opacity-70" style={{ color: '#5a3217' }}>
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Admin</span>
            </Link>
            <Button
              onClick={handleAddNewClick}
              style={{ backgroundColor: '#f26222', color: 'white' }}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add New Banner
            </Button>
          </div>

          <h1 className="font-abolition text-4xl sm:text-5xl text-[#5a3217] mb-8">Home Page Banners</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {banners.map(banner => (
              <Card key={banner.id} className="tool-card-bg border-0 elegant-shadow overflow-hidden">
                <div
                  className="relative overflow-hidden bg-cover bg-center"
                  style={{ 
                    backgroundImage: `url(${banner.image_url})`,
                    aspectRatio: '3.44 / 1'
                  }}
                >
                  <div className={`absolute inset-0 flex p-4 md:p-6 ${alignmentClasses[banner.content_alignment] || alignmentClasses.left}`}>
                    <div className="max-w-md space-y-2">
                      {banner.title && (
                        <h2 
                          className="text-2xl md:text-3xl font-bold uppercase"
                          style={{ 
                            fontFamily: "'Abolition', 'Oswald', sans-serif",
                            color: colorPalette[banner.title_color] || colorPalette.tobacco,
                          }}
                        >
                          {banner.title}
                        </h2>
                      )}
                      {banner.strapline && (
                        <p 
                          className="text-sm md:text-base"
                          style={{ 
                            color: colorPalette[banner.strapline_color] || colorPalette.tobacco,
                          }}
                        >
                          {banner.strapline}
                        </p>
                      )}
                      {banner.button_text && banner.button_link && (
                        <div className="pt-2">
                          <Button
                            size="sm"
                            className="uppercase font-bold text-xs px-4 py-2"
                            style={{
                              backgroundColor: colorPalette[banner.button_bg_color] || colorPalette.tangerine,
                              color: colorPalette[banner.button_text_color] || colorPalette.bone,
                            }}
                            asChild
                          >
                            <Link to="#">{banner.button_text}</Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold main-text">{banner.name}</h3>
                      <div className="flex items-center gap-1">
                        {banner.is_active ? (
                          <Eye className="w-4 h-4 text-green-600" title="Active" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" title="Inactive" />
                        )}
                      </div>
                    </div>
                    <span className="text-xs main-text opacity-60">Order: {banner.sort_order}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-xs main-text opacity-70">
                      Alignment: {banner.content_alignment || 'left'}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditClick(banner)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(banner.id)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {banners.length === 0 && (
                <Card className="tool-card-bg border-0 elegant-shadow text-center py-12">
                    <CardContent>
                        <h3 className="text-xl font-bold main-text mb-2">No Banners Yet</h3>
                        <p className="main-text opacity-70 mb-4">Create your first home page banner to get started.</p>
                        <Button
                          onClick={handleAddNewClick}
                          style={{ backgroundColor: '#f26222', color: 'white' }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add First Banner
                        </Button>
                    </CardContent>
                </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
