import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, Image, CheckCircle } from 'lucide-react';
import { UploadFile } from '@/integrations/Core';
import { League } from '@/entities/League';

export default function LeagueSettingsModal({ isOpen, onClose, league, onUpdate }) {
    const [uploadingMasthead, setUploadingMasthead] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleUploadMasthead = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !league?.id) return;

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file.');
            setSuccess('');
            return;
        }
        
        setError('');
        setSuccess('');
        setUploadingMasthead(true);
        
        try {
            console.log('Starting masthead upload for league:', league.id);
            const response = await UploadFile({ file });
            console.log('Upload response:', response);
            
            if (response?.file_url) {
                console.log('Updating league with masthead URL:', response.file_url);
                await League.update(league.id, { masthead_url: response.file_url });
                console.log('League updated successfully');
                
                setSuccess('Masthead uploaded successfully!');
                
                // Clear the input
                event.target.value = '';
                
                // Call onUpdate to refresh the league data on the parent page
                if (onUpdate) {
                    onUpdate();
                }
            } else {
                throw new Error('No file URL returned from upload');
            }
        } catch (error) {
            console.error('Error uploading masthead:', error);
            setError(`Failed to upload masthead: ${error.message}`);
        } finally {
            setUploadingMasthead(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#e5e4cd' }}>
                <DialogHeader>
                    <DialogTitle className="main-text flex items-center gap-2">
                        <Image className="w-5 h-5" />
                        League Settings
                    </DialogTitle>
                    <DialogDescription className="main-text opacity-80">
                        Manage settings for "{league?.name}".
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div>
                        <Label className="main-text font-semibold">League Masthead</Label>
                        <p className="text-sm main-text opacity-70 mb-2">Upload a banner image for your league page. Recommended size: 1200x400px.</p>
                        <div className="flex items-center gap-4">
                            <label htmlFor="masthead-upload-modal" className={`inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${uploadingMasthead ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#007e81] text-white hover:bg-[#005f61]'}`}>
                                {uploadingMasthead ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4 mr-2" />
                                )}
                                {uploadingMasthead ? 'Uploading...' : 'Choose Image'}
                            </label>
                            <input
                                id="masthead-upload-modal"
                                type="file"
                                accept="image/*"
                                onChange={handleUploadMasthead}
                                disabled={uploadingMasthead}
                                className="hidden"
                            />
                        </div>
                        
                        {success && (
                            <div className="flex items-center gap-2 mt-2 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <p className="text-sm">{success}</p>
                            </div>
                        )}
                        
                        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
                        
                        {league?.masthead_url && (
                            <div className="mt-4">
                                <p className="text-sm main-text font-medium mb-1">Current Masthead:</p>
                                <img src={league.masthead_url} alt="Current masthead" className="rounded-md object-cover w-full h-24 border" />
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}