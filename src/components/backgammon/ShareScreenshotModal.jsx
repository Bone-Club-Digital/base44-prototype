import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Share2, Download, Twitter, Facebook, Linkedin, Copy, CheckCircle, ImageIcon } from 'lucide-react';
import { UploadFile } from '@/integrations/Core';

export default function ShareScreenshotModal({ isOpen, onClose, gameSession, currentUser }) {
  const [loading, setLoading] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);

  const captureGameBoard = async () => {
    setLoading(true);
    try {
      // Load html2canvas if not already loaded
      if (!window.html2canvas) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = () => captureAfterLoad();
        document.head.appendChild(script);
      } else {
        await captureAfterLoad();
      }
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      alert('Failed to capture screenshot. Please try again.');
      setLoading(false);
    }
  };

  const captureAfterLoad = async () => {
    try {
      // Find the game board container - look for the data-game-board attribute first
      const gameContainer = document.querySelector('[data-game-board]') || 
                          document.querySelector('.backgammon-board-container') ||
                          document.querySelector('.game-board-wrapper') ||
                          document.querySelector('.backgammon-board') ||
                          document.querySelector('.game-container');
      
      if (!gameContainer) {
        alert('Could not find game board to capture. Make sure you\'re on a game page.');
        setLoading(false);
        return;
      }

      // Configure html2canvas options for better quality
      const canvas = await window.html2canvas(gameContainer, {
        backgroundColor: '#e5e4cd',
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: false,
        width: gameContainer.offsetWidth,
        height: gameContainer.offsetHeight,
        scrollX: 0,
        scrollY: 0,
        ignoreElements: (element) => {
          // Ignore certain elements that might cause issues
          return element.classList.contains('ignore-screenshot');
        }
      });

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        try {
          // Create a file from the blob
          const file = new File([blob], `bone-club-match-${Date.now()}.png`, { type: 'image/png' });
          
          // Upload the file
          const { file_url } = await UploadFile({ file });
          setScreenshotUrl(file_url);
          
          // Set default message with game details
          const playerNames = getPlayerNames();
          const matchDetails = getMatchDetails();
          setCustomMessage(`Just played ${matchDetails} on Bone Club! 🎲 ${playerNames.join(' vs ')} #backgammon #boneclub`);
          
        } catch (uploadError) {
          console.error('Error uploading screenshot:', uploadError);
          alert('Failed to upload screenshot. Please try again.');
        } finally {
          setLoading(false);
        }
      }, 'image/png', 0.95);

    } catch (error) {
      console.error('Error with html2canvas:', error);
      alert('Failed to capture screenshot. Please try again.');
      setLoading(false);
    }
  };

  const getPlayerNames = () => {
    if (!gameSession || !currentUser) return ['Player 1', 'Player 2'];
    
    const names = [];
    if (gameSession.player_teal_id === currentUser?.id) {
      names.push(currentUser.username || currentUser.full_name || 'You');
      names.push('Opponent');
    } else {
      names.push('Opponent');
      names.push(currentUser?.username || currentUser.full_name || 'You');
    }
    return names;
  };

  const getMatchDetails = () => {
    if (!gameSession?.match_state) return 'an exciting backgammon match';
    
    const targetScore = gameSession.match_state.target_score;
    const tealScore = gameSession.match_state.player_teal_score || 0;
    const boneScore = gameSession.match_state.player_bone_score || 0;
    
    if (gameSession.status === 'completed') {
      return `a ${targetScore}-point match (final: ${tealScore}-${boneScore})`;
    } else {
      return `a ${targetScore}-point match (current: ${tealScore}-${boneScore})`;
    }
  };

  const handleShare = (platform) => {
    const message = customMessage || 'Check out this backgammon match on Bone Club!';
    const url = 'https://boneclub.co.uk';
    
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        // Twitter supports direct image and text sharing
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`;
        break;
        
      case 'facebook':
        // Facebook sharing is more limited - we'll copy the image URL and message for manual sharing
        handleFacebookShare(message, url);
        return;
        
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(message)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
    }
  };

  const handleFacebookShare = async (message, url) => {
    // Since Facebook doesn't support direct image sharing via URL parameters,
    // we'll provide a better user experience by copying both the image URL and message
    // and then opening Facebook with instructions
    
    if (!screenshotUrl) return;
    
    try {
      // Copy image URL to clipboard first
      await navigator.clipboard.writeText(screenshotUrl);
      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 3000);
      
      // Show instructions and open Facebook
      alert(`📋 Game image URL copied to clipboard!\n\n📝 Instructions for Facebook:\n1. Click OK to open Facebook\n2. Create a new post\n3. Paste the image URL or upload the downloaded image\n4. Add your message: "${message}"\n\nTip: You can also download the image using the Download button below.`);
      
      // Open Facebook in a new tab
      const facebookUrl = `https://www.facebook.com/`;
      window.open(facebookUrl, '_blank');
      
    } catch (error) {
      // Fallback: just open Facebook and show a message
      alert(`For Facebook sharing:\n1. Download the image using the button below\n2. Copy this message: "${message}"\n3. Create a new Facebook post and upload the image manually`);
      window.open('https://www.facebook.com/', '_blank');
    }
  };

  const handleCopyMessage = async () => {
    const message = customMessage || 'Check out this backgammon match on Bone Club!';
    
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = message;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyImageUrl = async () => {
    if (!screenshotUrl) return;
    
    try {
      await navigator.clipboard.writeText(screenshotUrl);
      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 2000);
    } catch (error) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = screenshotUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!screenshotUrl) return;
    
    const link = document.createElement('a');
    link.href = screenshotUrl;
    link.download = `bone-club-match-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    setScreenshotUrl(null);
    setCustomMessage('');
    setCopied(false);
    setImageCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Game Screenshot
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!screenshotUrl ? (
            <div className="text-center py-8">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">Capture Game Screenshot</h3>
              <p className="text-gray-600 mb-6">
                Take a screenshot of the current game board including scores, dice, and cube position.
              </p>
              <Button
                onClick={captureGameBoard}
                disabled={loading}
                className="px-8 py-3"
                style={{ backgroundColor: '#007e81', color: 'white' }}
              >
                {loading ? 'Capturing...' : 'Capture Screenshot'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Screenshot Preview */}
              <div className="text-center">
                <img 
                  src={screenshotUrl} 
                  alt="Game Screenshot" 
                  className="max-w-full h-auto rounded-lg shadow-lg border mx-auto"
                  style={{ maxHeight: '300px' }}
                />
              </div>

              {/* Message Customization */}
              <div className="space-y-2">
                <Label htmlFor="message">Customize your message:</Label>
                <Textarea
                  id="message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Enter your message..."
                  rows={3}
                />
              </div>

              {/* Sharing Options */}
              <div className="grid grid-cols-2 gap-4">
                {/* Direct Share Buttons */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Quick Share:</h4>
                  
                  <Button
                    onClick={() => handleShare('twitter')}
                    className="w-full flex items-center gap-2 bg-[#1DA1F2] hover:bg-[#1a91da] text-white"
                  >
                    <Twitter className="w-4 h-4" />
                    Twitter
                  </Button>

                  <Button
                    onClick={() => handleShare('facebook')}
                    className="w-full flex items-center gap-2 bg-[#1877F2] hover:bg-[#166fe5] text-white"
                  >
                    <Facebook className="w-4 h-4" />
                    Facebook
                  </Button>

                  <Button
                    onClick={() => handleShare('linkedin')}
                    className="w-full flex items-center gap-2 bg-[#0A66C2] hover:bg-[#095ba1] text-white"
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </Button>
                </div>

                {/* Copy & Download Options */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Copy & Download:</h4>
                  
                  <Button
                    onClick={handleCopyMessage}
                    variant="outline"
                    className="w-full flex items-center gap-2"
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Message Copied!' : 'Copy Message'}
                  </Button>

                  <Button
                    onClick={handleCopyImageUrl}
                    variant="outline"
                    className="w-full flex items-center gap-2"
                  >
                    {imageCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {imageCopied ? 'Image URL Copied!' : 'Copy Image URL'}
                  </Button>

                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    className="w-full flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Image
                  </Button>
                </div>
              </div>

              {/* Facebook Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-semibold text-blue-800 mb-2">📘 Facebook Sharing Tip:</h5>
                <p className="text-sm text-blue-700">
                  Facebook doesn't support direct image sharing via links. Click the Facebook button above to copy the image URL and get instructions for manual sharing, or use the Download button to save the image to your device.
                </p>
              </div>

              {/* New Screenshot Button */}
              <div className="text-center pt-4 border-t">
                <Button
                  onClick={captureGameBoard}
                  variant="outline"
                  disabled={loading}
                >
                  {loading ? 'Capturing...' : 'Take New Screenshot'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}