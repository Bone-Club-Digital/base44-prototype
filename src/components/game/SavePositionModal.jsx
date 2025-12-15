
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, RefreshCw, CheckCircle } from 'lucide-react';
import { SharedGameSnapshot } from '@/entities/SharedGameSnapshot';
import { createPageUrl } from '@/utils';

export default function SavePositionModal({ 
  isOpen, 
  onClose, 
  gameSession, 
  playerInfo, 
  user, 
  playerColor 
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [savedSnapshotId, setSavedSnapshotId] = useState(null);
  const [error, setError] = useState(null);

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setIsProcessing(false);
    setSuccess(false);
    setSavedSnapshotId(null);
    setError(null);
    onClose();
  };

  React.useEffect(() => {
    if (isOpen && !title && !description) {
      const generateDefaultContent = () => {
        if (!gameSession || !playerInfo) return { title: 'Game Position', description: '' };

        const tealPlayer = playerInfo.tealPlayer?.username || 'Teal Player';
        const bonePlayer = playerInfo.bonePlayer?.username || 'Bone Player';
        
        const matchState = gameSession.match_state || {};
        const tealScore = matchState.player_teal_score || 0;
        const boneScore = matchState.player_bone_score || 0;
        const targetScore = matchState.target_score || 7;

        const title = `${tealPlayer} vs ${bonePlayer}`;
        const description = `Match score: ${tealScore}-${boneScore} (first to ${targetScore}). An exciting position from our Bone Club match!`;

        return { title, description };
      };

      const defaults = generateDefaultContent();
      setTitle(defaults.title);
      setDescription(defaults.description);
    }
  }, [isOpen, gameSession, playerInfo, title, description]);

  const savePositionWithoutScreenshot = async () => {
    if (!title.trim()) {
      setError('Please enter a title for this position.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('[SavePositionModal] Starting save process...');
      console.log('[SavePositionModal] User:', user);
      console.log('[SavePositionModal] Game session:', gameSession);

      // For now, let's use a placeholder screenshot URL to test the basic save functionality
      const placeholderScreenshotUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/e9bb481a7_bone_club_trans.png";

      // --- FIX: Sanitize complex objects to ensure they are pure JSON before saving ---
      const cleanGameState = JSON.parse(JSON.stringify(gameSession.game_state || {}));
      const cleanMatchState = JSON.parse(JSON.stringify(gameSession.match_state || {}));
      const cleanPlayerInfo = JSON.parse(JSON.stringify(playerInfo || {}));

      const snapshotData = {
        user_id: user.id,
        username: user.username || user.full_name || 'Unknown User',
        title: title.trim(),
        description: description.trim() || 'A saved game position',
        game_state: cleanGameState,
        match_state: cleanMatchState,
        player_info: cleanPlayerInfo,
        screenshot_url: placeholderScreenshotUrl,
        player_color_perspective: playerColor || 'teal'
      };

      console.log('[SavePositionModal] Saving sanitized snapshot data:', snapshotData);

      const savedSnapshot = await SharedGameSnapshot.create(snapshotData);
      
      console.log('[SavePositionModal] Successfully saved snapshot:', savedSnapshot);
      
      setSavedSnapshotId(savedSnapshot.id);
      setSuccess(true);

    } catch (err) {
      console.error('[SavePositionModal] Error saving position:', err);
      console.error('[SavePositionModal] Error details:', err.message, err.code, err.response);
      setError(`Failed to save position: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const viewSavedPosition = () => {
    if (savedSnapshotId) {
      window.open(createPageUrl(`SharedGameSnapshot?id=${savedSnapshotId}`), '_blank');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="tool-card-bg max-w-md">
        <DialogHeader>
          <DialogTitle className="main-text flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save Position
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold main-text mb-2">Position Saved!</h3>
            <p className="main-text mb-6">Your game position has been saved and can now be shared.</p>
            
            <div className="flex gap-3 justify-center">
              <Button onClick={viewSavedPosition} style={{ backgroundColor: '#007e81', color: 'white' }}>
                View Position
              </Button>
              <Button onClick={handleClose} variant="outline">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="position-title" className="main-text">Title</Label>
              <Input
                id="position-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for this position"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="position-description" className="main-text">Description</Label>
              <Textarea
                id="position-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description (optional)"
                className="mt-1 h-20"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                onClick={handleClose} 
                variant="outline"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={savePositionWithoutScreenshot}
                disabled={isProcessing}
                style={{ backgroundColor: '#f26222', color: 'white' }}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Position
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
