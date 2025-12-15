import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Upload, X } from 'lucide-react';
import { UploadFile } from '@/integrations/Core';
import { Club } from '@/entities/Club';

export default function ClubLogoUploadModal({ isOpen, onClose, club, onUploadComplete }) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB.');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target.result);
    reader.readAsDataURL(file);

    handleFileUpload(file);
  };

  const handleFileUpload = async (file) => {
    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      
      // Update the club with the new logo URL
      await Club.update(club.id, { logo_url: file_url });
      
      onUploadComplete();
      onClose();
      alert('Club logo updated successfully!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setIsUploading(false);
      setPreviewUrl(null);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setPreviewUrl(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Change Club Logo
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current Logo */}
          <div>
            <h4 className="font-medium mb-2">Current Logo:</h4>
            {club.logo_url ? (
              <img
                src={club.logo_url}
                alt={`${club.name} current logo`}
                className="w-32 h-32 object-cover rounded-lg border"
              />
            ) : (
              <div className="w-32 h-32 bg-gray-200 rounded-lg border flex items-center justify-center">
                <Camera className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Preview */}
          {previewUrl && (
            <div>
              <h4 className="font-medium mb-2">Preview:</h4>
              <img
                src={previewUrl}
                alt="Logo preview"
                className="w-32 h-32 object-cover rounded-lg border"
              />
            </div>
          )}

          {/* Upload Controls */}
          <div className="space-y-3">
            <input
              type="file"
              id="club-logo-upload"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            
            <div className="flex gap-2">
              <label
                htmlFor="club-logo-upload"
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#007e81] text-white rounded-md cursor-pointer hover:opacity-90 transition-opacity ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {isUploading ? 'Uploading...' : 'Select New Logo'}
              </label>
              
              <Button
                onClick={handleClose}
                variant="outline"
                disabled={isUploading}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Supported formats: JPG, PNG, GIF. Maximum size: 5MB.
            <br />
            Recommended dimensions: 200x200 pixels (square).
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}