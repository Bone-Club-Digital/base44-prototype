
import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { SharedGameSnapshot } from '@/entities/SharedGameSnapshot';
import { Button } from '@/components/ui/button';
import BackgammonBoard from '../components/backgammon/BackgammonBoard';
import { RefreshCw, ArrowLeft, Twitter, Facebook, Linkedin, Copy, Check } from 'lucide-react';

// A helper to dynamically set meta tags.
const MetaTags = ({ title, description, imageUrl, pageUrl }) => {
  useEffect(() => {
    document.title = `${title} - Bone Club`;

    const setMeta = (name, content) => {
      let element = document.querySelector(`meta[name="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('name', name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    const setProperty = (prop, content) => {
      let element = document.querySelector(`meta[property="${prop}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('property', prop);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    setMeta('description', description);

    setProperty('og:type', 'website');
    setProperty('og:url', pageUrl);
    setProperty('og:title', title);
    setProperty('og:description', description);
    setProperty('og:image', imageUrl);

    setProperty('twitter:card', 'summary_large_image');
    setProperty('twitter:url', pageUrl);
    setProperty('twitter:title', title);
    setProperty('twitter:description', description);
    setProperty('twitter:image', imageUrl);

  }, [title, description, imageUrl, pageUrl]);

  return null; // This component does not render anything
};


export default function SharedGameSnapshotPage() {
    const location = useLocation();
    const snapshotId = new URLSearchParams(location.search).get('id');
    const pageUrl = window.location.href; // Get the current full URL for sharing

    const [snapshot, setSnapshot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false); // Renamed from copySuccess to copied

    // This variable is not used in the outline, keeping it.
    // const playerPerspective = new URLSearchParams(location.search).get('perspective'); 

    useEffect(() => {
        if (!snapshotId) {
            setError('No snapshot ID provided.');
            setLoading(false);
            return;
        }

        const fetchSnapshot = async () => {
            console.log('[SharedGameSnapshot] Attempting to fetch snapshot with ID:', snapshotId);
            try {
                const data = await SharedGameSnapshot.get(snapshotId);
                console.log('[SharedGameSnapshot] Successfully fetched snapshot:', data);
                if (!data) {
                    throw new Error('Snapshot not found.');
                }
                setSnapshot(data);
            } catch (err) {
                console.error("[SharedGameSnapshot] Failed to fetch shared game snapshot:", err);
                console.error("[SharedGameSnapshot] Response status:", err.response?.status);
                console.error("[SharedGameSnapshot] Response data:", err.response?.data);
                setError('Failed to load game snapshot. It may have been deleted or the link is incorrect.');
            } finally {
                setLoading(false);
            }
        };

        fetchSnapshot();
    }, [snapshotId]);

    // Add transformation functions similar to Game page
    const getTransformedPosition = (gameState, playerColorPerspective) => {
        if (!gameState || !gameState.position) return {};
        
        if (playerColorPerspective === 'bone') {
            const transformed = {};
            Object.keys(gameState.position).forEach(point => {
                const originalPoint = parseInt(point);
                const newPoint = 25 - originalPoint;
                transformed[newPoint] = { ...gameState.position[point] };
            });
            return transformed;
        }
        return gameState.position;
    };

    const getTransformedBar = (gameState, playerColorPerspective) => {
        if (!gameState || !gameState.bar) return { teal: 0, bone: 0 };
        
        if (playerColorPerspective === 'bone') {
            return { teal: gameState.bar.bone, bone: gameState.bar.teal };
        }
        return gameState.bar;
    };

    const getTransformedBornOff = (gameState, playerColorPerspective) => {
        if (!gameState || !gameState.bornOff) return { teal: 0, bone: 0 };
        
        if (playerColorPerspective === 'bone') {
            return { teal: gameState.bornOff.bone, bone: gameState.bornOff.teal };
        }
        return gameState.bornOff;
    };

    const getTransformedCubeOwner = (gameState, playerColorPerspective) => {
        if (!gameState || !gameState.cubeOwner) return 'center';
        
        if (playerColorPerspective === 'bone') {
            if (gameState.cubeOwner === 'teal') return 'bone';
            if (gameState.cubeOwner === 'bone') return 'teal';
        }
        return gameState.cubeOwner;
    };

    const handleShare = (platform) => {
        let shareUrl = '';
        const message = snapshot ? `${snapshot.title}: ${snapshot.description}` : "Check out this Backgammon game snapshot!";
        
        switch (platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(pageUrl)}`;
                break;
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;
                break;
        }
        
        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(pageUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Fallback for browsers that don't support clipboard API
            console.warn("Clipboard API not supported, falling back to execCommand:", err);
            const textArea = document.createElement('textarea');
            textArea.value = pageUrl;
            textArea.style.position = 'fixed';
            textArea.style.top = '0';
            textArea.style.left = '0';
            textArea.style.width = '1px';
            textArea.style.height = '1px';
            textArea.style.padding = '0';
            textArea.style.border = 'none';
            textArea.style.outline = 'none';
            textArea.style.boxShadow = 'none';
            textArea.style.background = 'transparent';

            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (execErr) {
                console.error('Failed to copy text using execCommand: ', execErr);
            } finally {
                document.body.removeChild(textArea);
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: '#5a3217' }} />
                    <p className="main-text text-lg">Loading game position...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#e5e4cd' }}>
                <div className="text-center max-w-md">
                    <h2 className="text-2xl font-bold main-text mb-4">Position Not Found</h2>
                    <p className="main-text mb-6">{error}</p>
                    <Link to={createPageUrl('Home')}>
                        <Button style={{ backgroundColor: '#f26222', color: 'white' }}>
                            Back to Lobby
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (!snapshot) {
        return null;
    }

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#e5e4cd' }}>
            <MetaTags 
                title={snapshot.title}
                description={snapshot.description}
                imageUrl={snapshot.screenshot_url}
                pageUrl={pageUrl}
            />
            
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-6">
                    <Link 
                        to={createPageUrl('Home')} 
                        className="inline-flex items-center gap-2 hover:opacity-70 transition-colors" 
                        style={{ color: '#5a3217' }}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Lobby</span>
                    </Link>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold main-text mb-2">{snapshot.title}</h1>
                    <p className="text-lg main-text opacity-80 mb-4">{snapshot.description}</p>
                    <p className="text-sm main-text opacity-60">
                        Shared by <strong>{snapshot.username}</strong> on {new Date(snapshot.created_date).toLocaleDateString()}
                    </p>
                </div>

                <div className="flex justify-center mb-8">
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                        <BackgammonBoard
                            position={getTransformedPosition(snapshot.game_state, snapshot.player_color_perspective)}
                            bar={getTransformedBar(snapshot.game_state, snapshot.player_color_perspective)}
                            bornOff={getTransformedBornOff(snapshot.game_state, snapshot.player_color_perspective)}
                            isPlayerTurn={false}
                            playerColor={snapshot.player_color_perspective}
                            doublingCube={{
                                value: snapshot.game_state?.cubeValue || 1,
                                owner: getTransformedCubeOwner(snapshot.game_state, snapshot.player_color_perspective),
                                disabled: true
                            }}
                            showControls={false}
                            showDoubleButton={false}
                            onRollDice={() => {}}
                            onOfferDouble={() => {}}
                            rollDisabled={true}
                            diceDisplay={snapshot.game_state?.dice ? [
                                { id: 1, value: snapshot.game_state.dice[0] || 0, playerColor: 'teal', isUsed: true },
                                { id: 2, value: snapshot.game_state.dice[1] || 0, playerColor: 'bone', isUsed: true }
                            ] : []}
                            showUndo={false}
                            undoReady={false}
                            showEndTurn={false}
                            endTurnReady={false}
                            onConfirmTurn={() => {}}
                            onUndoMoves={() => {}}
                            onCheckerClick={() => {}}
                            isDoubleBeingOffered={false}
                            isPlayerReceivingDouble={false}
                            doubledCubeValue={snapshot.game_state?.cubeValue || 1}
                            onTakeDouble={() => {}}
                            onPassDouble={() => {}}
                            matchState={snapshot.match_state || {}}
                            timeLeft={{ teal: 0, bone: 0 }}
                            delaySecondsRemaining={0}
                            isFirstMove={false}
                            onInitialRoll={() => {}}
                            isActionInProgress={false}
                            currentPlayerTurn={snapshot.game_state?.current_player_turn || 'teal'}
                            formatTime={(seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`}
                            isWaitingForOpponent={false}
                            isInitialTurnForDisplay={false}
                            boardLogoUrl={null}
                            selectedPoint={null}
                            validMoves={[]}
                            gameSession={{ 
                                game_state: snapshot.game_state,
                                match_state: snapshot.match_state,
                                status: 'completed'
                            }}
                        />
                    </div>
                </div>

                {/* Social Sharing Buttons */}
                <div className="flex justify-center gap-4 mb-8">
                    <Button
                        onClick={() => handleShare('facebook')}
                        style={{ backgroundColor: '#4267B2', color: 'white' }}
                        className="flex items-center gap-2"
                    >
                        <Facebook className="w-5 h-5" />
                        Share on Facebook
                    </Button>
                    
                    <Button
                        onClick={() => handleShare('twitter')}
                        style={{ backgroundColor: '#1DA1F2', color: 'white' }}
                        className="flex items-center gap-2"
                    >
                        <Twitter className="w-5 h-5" />
                        Share on Twitter
                    </Button>
                    
                    <Button
                        onClick={() => handleShare('linkedin')}
                        style={{ backgroundColor: '#0077B5', color: 'white' }}
                        className="flex items-center gap-2"
                    >
                        <Linkedin className="w-5 h-5" />
                        Share on LinkedIn
                    </Button>
                    
                    <Button
                        onClick={handleCopyLink}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        {copied ? 'Copied!' : 'Copy Link'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
