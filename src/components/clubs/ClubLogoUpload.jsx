import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload } from 'lucide-react';
import { UploadFile } from '@/integrations/Core';
import { Club } from '@/entities/Club';

export default function ClubLogoUpload({ club, onLogoUpdated, isAdmin }) {
  const [isUploading, setIsUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const handleFileUpload = async (event) => {
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

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      
      // Update the club with the new logo URL
      await Club.update(club.id, { logo_url: file_url });
      
      onLogoUpdated(file_url);
      setShowUpload(false);
      alert('Club logo updated successfully!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-3">
      {!showUpload ? (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowUpload(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            {club.logo_url ? 'Change Logo' : 'Add Logo'}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="club-logo"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isUploading}
          />
          <label
            htmlFor="club-logo"
            className="flex items-center gap-2 px-3 py-2 bg-[#007e81] text-white rounded-md cursor-pointer hover:opacity-90 text-sm"
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isUploading ? 'Uploading...' : 'Choose Image'}
          </label>
          
          <Button
            onClick={() => setShowUpload(false)}
            variant="outline"
            size="sm"
            disabled={isUploading}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}