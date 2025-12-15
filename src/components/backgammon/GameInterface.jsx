
import React, { useState, useEffect } from "react"; // Added useEffect for react lifecycle hooks
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// Existing component
import ShareScreenshotModal from './ShareScreenshotModal'; // Existing component
import DiceFace from './DiceFace'; // Existing component
import {
  Check,
  Square,
  Clock,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Camera,
  Share2,
  Save,   // New: for Roll Dice button
  Undo2,  // New: for Undo button
  Layers2 // New: for Double button
} from 'lucide-react';

// --- Placeholder/Helper Components (as implied by the outline) ---

// PlayerPanel component based on outline's usage
function PlayerPanel({ player, playerData, timeRemaining, isTurn, color, isLocalPlayer, formatTime }) {
  const playerAvatar = playerData?.picture;
  const playerName = playerData?.name;
  const playerScore = playerData?.score;
  const formattedTime = formatTime && timeRemaining !== undefined ? formatTime(timeRemaining) : '00:00';

  return (
    <Card className={`transition-all duration-300 ${
      isTurn
        ? `ring-2 ring-${color === 'teal' ? 'teal' : 'amber'}-500 shadow-lg transform scale-105`
        : 'opacity-75'
    } bg-white/80 backdrop-blur-sm`}>
      <CardContent className="p-2 md:p-4 text-center">
        <Avatar className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-1 md:mb-2">
          <AvatarImage src={playerAvatar} alt={`${playerName} Player`} className="object-cover" />
          <AvatarFallback className={`bg-${color === 'teal' ? 'teal' : 'amber'}-600 text-white text-xs md:text-sm font-bold`}>
            {playerName ? playerName.substring(0, 2).toUpperCase() : (color === 'teal' ? 'TP' : 'BP')}
          </AvatarFallback>
        </Avatar>
        <h3 className={`font-bold text-${color === 'teal' ? 'teal' : 'amber'}-700 text-xs md:text-base mb-1 truncate`}>{playerName || `${color} Player`}</h3>
        <p className="text-sm md:text-lg font-bold mb-1">{playerScore || 0}</p>
        {playerData?.use_clock && (
          <div className={`text-xs md:text-sm font-mono ${
            isTurn && timeRemaining !== undefined && timeRemaining <= 30
              ? 'text-red-600 font-bold'
              : 'text-gray-600'
          }`}>
            {formattedTime}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// BackgammonBoard component (placeholder as it was not in the original GameInterface)
// This assumes the board component exists elsewhere and is passed appropriate props.
function BackgammonBoard({ diceRoll, onMove, userColor, currentPlayerTurn, gameSession, boardState, options }) {
  // In a real application, this would render the actual backgammon board.
  // For this implementation, it's a placeholder to ensure the file is functional.
  return (
    <div className="w-full aspect-[1/1.1] md:aspect-[1/0.8] lg:aspect-[1/0.7] bg-gray-700 flex flex-col items-center justify-center text-white text-md md:text-xl rounded-md relative overflow-hidden">
      <p className="font-bold mb-2">Backgammon Board Placeholder</p>
      <p className="text-sm">Current Turn: <span className={currentPlayerTurn === 'teal' ? 'text-teal-400' : 'text-amber-400'}>{currentPlayerTurn}</span></p>
      {diceRoll && diceRoll.length > 0 && (
        <div className="flex gap-2 mt-2">
          {diceRoll.map((die, index) => (
            <DiceFace
              key={die.id || index}
              value={die.value || 0}
              playerColor={die.playerColor || (currentPlayerTurn === 'teal' ? 'teal' : 'bone')}
              isUsed={die.isUsed || false}
              size="sm" // Assuming DiceFace can take a size prop
            />
          ))}
        </div>
      )}
      {/* <Button onClick={() => onMove?.({from: 1, to: 2})} className="mt-4">Simulate Move</Button> */}
      <p className="absolute bottom-2 text-xs text-gray-400">Board State & Movement Logic Here</p>
    </div>
  );
}

// DoubleOfferModal component (placeholder for new modal)
function DoubleOfferModal({ isOpen, onAccept, onDecline, onClose, isMyTurn, doublingCubeValue, opponentName }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-sm w-full">
        <h3 className="text-lg font-bold mb-4 text-gray-800">Double Offer!</h3>
        <p className="mb-4 text-gray-600">
          {opponentName} has offered to double the stakes to {doublingCubeValue * 2}.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={onAccept} className="flex-1 bg-green-600 hover:bg-green-700">Accept</Button>
          <Button onClick={onDecline} variant="destructive" className="flex-1">Decline (Resign)</Button>
        </div>
        {/* If a close button is desired for non-actionable dismissals, it would go here */}
        {/* <Button onClick={onClose} variant="outline" className="mt-4">Close</Button> */}
      </div>
    </div>
  );
}

// ResignConfirmModal component (placeholder for new modal)
function ResignConfirmModal({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-sm w-full">
        <h3 className="text-lg font-bold mb-4 text-gray-800">Confirm Resignation</h3>
        <p className="mb-4 text-gray-600">Are you sure you want to resign this game? This will result in a loss.</p>
        <div className="flex gap-4 justify-center">
          <Button onClick={onConfirm} variant="destructive" className="flex-1">Yes, Resign</Button>
          <Button onClick={onCancel} variant="outline" className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}
// --- End Placeholder/Helper Components ---


export default function GameInterface({
  gameSession,
  user,
  onMove,
  onRollDice,
  onOfferDouble,
  onRespondToDouble,
  onResign,
  gameStatus,
  lastMoveBy,
  currentPlayerTurn,
  tealPlayerPicture,
  tealPlayerName,
  bonePlayerPicture,
  bonePlayerName,
  matchState,
  timeLeft,
  formatTime,
  isFirstMove,
  rollDisabled,
  isActionInProgress,
  doublingCube,
  isDoubleBeingOffered,
  showRollButton, // This will largely be managed by renderActionButton now
  showDoubleButton, // This will largely be managed by the new Double button
  showEndTurn, // This will largely be managed by renderActionButton now
  endTurnReady,
  onConfirmTurn,
  showUndo, // This will largely be managed by the new Undo button
  undoReady,
  onUndoMoves,
  onSavePosition,
  onSharePosition,
  isWaitingForOpponent,
  isReady,
  onPlayerReady,
  delaySecondsRemaining,
  toggleVideo,
  toggleAudio,
  videoEnabled,
  audioEnabled,
  videoContainerRef,
  isVideoCallActive,
  joinVideoCall,
  leaveVideoCall,
  diceDisplay,
  boardState, // Assuming boardState is passed for BackgammonBoard
  boardOptions, // Assuming boardOptions are passed for BackgammonBoard
  gameLog, // NEW PROP: for displaying game actions/events
}) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false); // New state for ResignConfirmModal
  const [showDoubleOfferModal, setShowDoubleOfferModal] = useState(false); // New state for DoubleOfferModal

  // Derive userColor based on user.id and gameSession.player_teal_id
  const userColor = gameSession.player_teal_id === user?.id ? 'teal' : 'bone';

  // Derived variables for PlayerPanel and other new layout elements
  const playerTeal = { username: tealPlayerName, picture: tealPlayerPicture };
  const playerBone = { username: bonePlayerName, picture: bonePlayerPicture };

  const playerDataTeal = {
    name: tealPlayerName,
    picture: tealPlayerPicture,
    score: matchState?.player_teal_score,
    use_clock: matchState?.use_clock
  };
  const playerDataBone = {
    name: bonePlayerName,
    picture: bonePlayerPicture,
    score: matchState?.player_bone_score,
    use_clock: matchState?.use_clock
  };

  const playerTealTimeRemaining = timeLeft?.teal;
  const playerBoneTimeRemaining = timeLeft?.bone;

  const isTealTurn = currentPlayerTurn === 'teal';
  const isBoneTurn = currentPlayerTurn === 'bone';

  const isUserTeal = userColor === 'teal';
  const isUserBone = userColor === 'bone';

  const playerBoneScore = matchState?.player_bone_score || 0;
  const playerTealScore = matchState?.player_teal_score || 0;

  const doublingCubeValue = doublingCube?.value || 1;
  const targetScore = matchState?.match_target_score || gameSession.match_target_score || 7; // Assuming match_target_score exists

  const isMyTurn = currentPlayerTurn === userColor;

  // Logic for showing double offer modal
  useEffect(() => {
    if (isDoubleBeingOffered && !isMyTurn) {
      setShowDoubleOfferModal(true);
    } else {
      setShowDoubleOfferModal(false);
    }
  }, [isDoubleBeingOffered, isMyTurn]);

  // Handler for accepting/declining a double, also manages modal state
  const handleRespondToDouble = (response) => {
    onRespondToDouble(response);
    setShowDoubleOfferModal(false);
  };

  // Handler for resignation, triggers confirmation modal
  const handleResign = () => {
    setShowResignConfirm(true);
  };

  // Confirm resignation
  const confirmResign = () => {
    onResign();
    setShowResignConfirm(false);
  };

  // NEW: hasRolled variable for simplified action logic
  const hasRolled = diceDisplay && diceDisplay.some(d => d.value > 0);

  // NEW: renderDice function - adapted from existing dice display logic
  const renderDice = () => {
    // Current empty state - using existing Square icons
    if (!diceDisplay || diceDisplay.length === 0 || (diceDisplay[0].value === 0 && diceDisplay[1].value === 0)) {
      return (
        <div className="flex justify-center gap-2 mb-4">
          <div className="w-16 h-16 bg-gray-200 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
            <Square className="w-6 h-6 text-gray-400" />
          </div>
          <div className="w-16 h-16 bg-gray-200 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
            <Square className="w-6 h-6 text-gray-400" />
          </div>
        </div>
      );
    }

    // Detect if it's the initial roll-off (isFirstMove) and dice have been rolled.
    // The outline implies showing one die for Teal and one for Bone during this specific "opening roll" phase.
    if (isFirstMove && diceDisplay.length === 2 && diceDisplay[0].value > 0 && diceDisplay[1].value > 0) {
      return (
        <div className="flex justify-center gap-2 mb-4">
          <DiceFace
            key={diceDisplay[0].id || 0}
            value={diceDisplay[0].value}
            playerColor={'teal'} // Explicitly teal for the first die in roll-off
            isUsed={diceDisplay[0].isUsed || false}
          />
          <DiceFace
            key={diceDisplay[1].id || 1}
            value={diceDisplay[1].value}
            playerColor={'bone'} // Explicitly bone for the second die in roll-off
            isUsed={diceDisplay[1].isUsed || false}
          />
        </div>
      );
    }

    // For all other regular rolls (after the roll-off, during actual game turns)
    return (
      <div className="flex justify-center gap-2 mb-4">
        {diceDisplay.map((die, index) => (
          <DiceFace
            key={die.id || index}
            value={die.value || 0}
            playerColor={die.playerColor || (currentPlayerTurn === 'teal' ? 'teal' : 'bone')}
            isUsed={die.isUsed || false}
          />
        ))}
      </div>
    );
  };

  // NEW: renderActionButton function - consolidates Roll/Confirm Turn logic
  const renderActionButton = () => {
    if (!isMyTurn) {
      return <div className="h-10"></div>; // Placeholder for alignment
    }

    if (!hasRolled) {
      return (
        <>
          <div style={{ fontSize: '10px', color: 'red', marginBottom: '4px' }}>
            DEBUG: isActionInProgress={String(isActionInProgress)}
          </div>
          <Button
            onClick={() => {
              console.log('[GameInterface] Roll button clicked', {
                isActionInProgress,
                isMyTurn,
                hasRolled,
                disabled: isActionInProgress
              });
              if (!isActionInProgress) {
                onRollDice();
              } else {
                console.warn('[GameInterface] Click blocked - action in progress');
              }
            }}
            disabled={isActionInProgress}
            className="w-full py-6 text-lg font-bold transition-all duration-200 shadow-lg"
            style={{
              backgroundColor: isActionInProgress ? '#9ca3af' : '#f26222',
              color: 'white',
              cursor: isActionInProgress ? 'not-allowed' : 'pointer',
              opacity: isActionInProgress ? 0.6 : 1
            }}
          >
            {isActionInProgress ? 'Rolling...' : 'Roll Dice'}
          </Button>
        </>
      );
    }

    return (
      <Button
        onClick={onConfirmTurn} // Mapped from onConfirmMoves in outline
        disabled={isActionInProgress || !endTurnReady} // Mapped from gameState.movesMade in outline
        className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold"
      >
        <Check className="w-5 h-5 mr-2" /> Confirm Moves
      </Button>
    );
  };


  return (
    <>
      <div className="flex flex-col md:flex-row items-stretch justify-center p-1 md:p-4 gap-1 md:gap-4 w-full h-full">

        {/* Mobile Layout */}
        <div className="md:hidden w-full flex items-stretch gap-1">
          {/* Left Player Panel (Mobile) */}
          <div className="w-24 flex-shrink-0">
            <PlayerPanel
              player={playerBone}
              playerData={playerDataBone}
              timeRemaining={playerBoneTimeRemaining}
              isTurn={isBoneTurn}
              color="bone"
              isLocalPlayer={isUserBone}
              formatTime={formatTime}
            />
          </div>

          {/* Center Column: Board and Match Info (Mobile) */}
          <div className="flex flex-col items-center gap-1 flex-grow min-w-0">

            {/* Match Score */}
            <div
              className="flex items-center justify-center gap-2 text-xs font-bold rounded-lg px-2 py-1 w-full max-w-[200px]"
              style={{ backgroundColor: '#5a3217', color: 'white' }}
            >
              <span className="truncate">{playerBone.username || 'Bone'}</span>
              <span className="text-sm">{playerBoneScore} - {playerTealScore}</span>
              <span className="truncate">{playerTeal.username || 'Teal'}</span>
            </div>

            {/* Board */}
            <div className="relative w-full aspect-[1/1.1]">
              <BackgammonBoard
                diceRoll={diceDisplay}
                onMove={onMove}
                userColor={userColor}
                currentPlayerTurn={currentPlayerTurn}
                gameSession={gameSession}
                boardState={boardState}
                options={boardOptions}
              />
            </div>

            {/* Match Target & Cube Info */}
            <div
              className="flex items-center justify-between gap-4 text-xs font-semibold rounded-lg px-2 py-1 w-full max-w-xs"
              style={{ backgroundColor: '#e5e4cd', color: '#5a3217' }}
            >
              <span>Match to: {targetScore}</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-500 text-white flex items-center justify-center text-xs rounded-sm">
                  {doublingCubeValue}
                </div>
                <span>Cube</span>
              </div>
            </div>
          </div>

          {/* Right Side: Video Call and Player Panel (Mobile) */}
          <div className="w-24 flex-shrink-0 flex flex-col gap-1">
            {/* Video Chat Component (Adapting existing div) */}
            {matchState?.use_video_chat && matchState?.video_chat_url && (
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-1 shadow-sm flex flex-col items-center justify-center h-24">
                <h4 className="font-semibold text-gray-700 text-xs mb-1">Video Chat</h4>
                <div ref={videoContainerRef} className="w-full h-12 bg-gray-200 flex items-center justify-center text-xs text-gray-500 overflow-hidden rounded">
                  {!isVideoCallActive ? (
                    <Button onClick={joinVideoCall} size="xs" className="px-2 py-1 text-xs">Join</Button>
                  ) : (
                    <div className="flex flex-col items-center">
                      <p>Active</p>
                      <Button onClick={leaveVideoCall} size="xs" variant="destructive" className="mt-1 px-2 py-1 text-xs">Leave</Button>
                    </div>
                  )}
                </div>
                <div className="flex gap-0.5 mt-1">
                  <Button onClick={toggleVideo} variant="outline" size="xs" className={videoEnabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                    {videoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                  </Button>
                  <Button onClick={toggleAudio} variant="outline" size="xs" className={audioEnabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                    {audioEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Right Player Panel */}
            <PlayerPanel
              player={playerTeal}
              playerData={playerDataTeal}
              timeRemaining={playerTealTimeRemaining}
              isTurn={isTealTurn}
              color="teal"
              isLocalPlayer={isUserTeal}
              formatTime={formatTime}
            />
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex flex-row items-stretch justify-center gap-4 w-full h-full">
          {/* Left Player Panel (Desktop) */}
          <div className="w-48 lg:w-56 flex-shrink-0 flex items-center">
            <PlayerPanel
              player={playerBone}
              playerData={playerDataBone}
              timeRemaining={playerBoneTimeRemaining}
              isTurn={isBoneTurn}
              color="bone"
              isLocalPlayer={isUserBone}
              formatTime={formatTime}
            />
          </div>

          {/* Center Column: Board and Match Info (Desktop) */}
          <div className="flex flex-col items-center gap-2 flex-grow min-w-0 max-w-lg md:max-w-2xl">

            {/* Match Score */}
            <div
              className="flex items-center justify-center gap-4 text-lg font-bold rounded-lg px-4 py-2 w-full max-w-xs"
              style={{ backgroundColor: '#5a3217', color: 'white' }}
            >
              <span className="truncate">{playerBone.username || 'Bone'}</span>
              <span className="text-xl">{playerBoneScore} - {playerTealScore}</span>
              <span className="truncate">{playerTeal.username || 'Teal'}</span>
            </div>

            {/* Board */}
            <div className="relative w-full">
              <BackgammonBoard
                diceRoll={diceDisplay}
                onMove={onMove}
                userColor={userColor}
                currentPlayerTurn={currentPlayerTurn}
                gameSession={gameSession}
                boardState={boardState}
                options={boardOptions}
              />
            </div>

            {/* Match Target & Cube Info */}
            <div
              className="flex items-center justify-between gap-4 text-base font-semibold rounded-lg px-4 py-2 w-full max-w-xs"
              style={{ backgroundColor: '#e5e4cd', color: '#5a3217' }}
            >
              <span>Match to: {targetScore}</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-500 text-white flex items-center justify-center text-sm rounded-sm">
                  {doublingCubeValue}
                </div>
                <span>Cube</span>
              </div>
            </div>
          </div>

          {/* Right Column: Video and Player Panel (Desktop) */}
          <div className="w-48 lg:w-56 flex-shrink-0 flex flex-col gap-4">
            {/* Video Chat Component (Adapting existing div) */}
            {matchState?.use_video_chat && matchState?.video_chat_url && (
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Video Chat
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={toggleVideo}
                      variant="outline"
                      size="sm"
                      className={videoEnabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}
                    >
                      {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      onClick={toggleAudio}
                      variant="outline"
                      size="sm"
                      className={audioEnabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}
                    >
                      {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="bg-gray-100 rounded-lg overflow-hidden">
                  <div ref={videoContainerRef} className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    {!isVideoCallActive ? (
                      <div className="text-center">
                        <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <Button onClick={joinVideoCall} size="sm">Join Video Call</Button>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        <p>Video call active</p>
                        <Button onClick={leaveVideoCall} size="sm" variant="destructive" className="mt-2">
                          Leave Call
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Right Player Panel */}
            <PlayerPanel
              player={playerTeal}
              playerData={playerDataTeal}
              timeRemaining={playerTealTimeRemaining}
              isTurn={isTealTurn}
              color="teal"
              isLocalPlayer={isUserTeal}
              formatTime={formatTime}
            />
          </div>
        </div>
      </div>

      {/* NEW: This Card consolidates Game Control Buttons, Dice Display, and Game Log */}
      <div className="w-full max-w-7xl mx-auto p-4 flex flex-col lg:flex-row gap-4">
        <Card className="flex-1 bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-sm order-2 lg:order-1">
          <CardContent className="p-4 space-y-4">
            {renderDice()} {/* Render dice using the new function */}

            {/* Render the primary action button (Roll or Confirm Moves) */}
            {renderActionButton()}

            {/* Secondary actions: Undo and Double */}
            <div className="flex gap-2">
              <Button
                onClick={onUndoMoves} // Mapped from onUndoMove in outline
                disabled={isActionInProgress || !undoReady} // Mapped from gameState.movesMade in outline
                variant="outline"
                className="w-1/2 h-9 text-xs action-button"
              >
                <Undo2 className="w-4 h-4 mr-1" /> Undo
              </Button>
              <Button
                onClick={onOfferDouble}
                disabled={isActionInProgress || !isMyTurn || hasRolled || matchState?.isCrawfordGame}
                variant="outline"
                className="w-1/2 h-9 text-xs action-button"
              >
                <Layers2 className="w-4 h-4 mr-1" /> Double
              </Button>
            </div>

            {/* Additional Buttons (Save, Share, Resign) - preserved functionality */}
            <div className="flex gap-2 justify-center flex-wrap mt-4">
              {onSavePosition && (
                <Button
                  onClick={onSavePosition}
                  variant="outline"
                  size="sm"
                  className="border-purple-400 text-purple-600 hover:bg-purple-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              )}
              {onSharePosition && (
                <Button
                  onClick={() => {
                    onSharePosition();
                    setShowShareModal(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="border-green-400 text-green-600 hover:bg-green-50"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              )}
              <Button
                onClick={handleResign}
                variant="destructive"
                size="sm"
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Resign
              </Button>
            </div>

            {/* Status Messages - preserved functionality */}
            {isWaitingForOpponent && (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  Waiting for opponent...
                </div>
              </div>
            )}

            {gameSession.status === 'waiting_for_start' && (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-3">Game is ready to start!</p>
                {!isReady && (
                  <Button onClick={onPlayerReady} className="bg-green-600 hover:bg-green-700 text-white">
                    I'm Ready
                  </Button>
                )}
                {isReady && (
                  <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Ready! Waiting for opponent...
                  </div>
                )}
              </div>
            )}

            {delaySecondsRemaining > 0 && (
              <div className="text-center py-2">
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  <Clock className="w-3 h-3 mr-1" />
                  Next turn in {delaySecondsRemaining}s
                </Badge>
              </div>
            )}
            {/* PRESERVING: Crawford Game Notice */}
            {matchState?.isCrawfordGame && (
              <Card className="bg-yellow-600/20 border-yellow-500/50 mt-4">
                <CardContent className="p-4">
                  <h3 className="text-yellow-800 font-bold text-sm">Crawford Game</h3>
                  <p className="text-yellow-700/80 text-xs">Doubling cube is not available in this game.</p>
                </CardContent>
              </Card>
            )}

            {/* Game Log */}
            <div className="game-log-container bg-gray-800 rounded-lg p-3 mt-4 max-h-48 overflow-y-auto">
              <h4 className="font-semibold text-sm mb-2 text-white/80">Game Log</h4>
              <div className="game-log">
                {gameLog && gameLog.slice().reverse().map((entry, index) => (
                  <p key={index} className="text-xs text-white/70 leading-snug">{entry}</p>
                ))}
              </div>
            </div>

             {/* Turn Indicator - Preserved, moved here as it's part of general game info */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600 mb-1">Current Turn</p>
              <Badge
                className={`font-bold ${
                  currentPlayerTurn === 'teal'
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {currentPlayerTurn === 'teal' ? (tealPlayerName || 'Teal Player') : (bonePlayerName || 'Bone Player')}
                {gameSession.status === 'in_progress' && ` (${currentPlayerTurn === 'teal' ? 'Teal' : 'Bone'})`}
              </Badge>
            </div>
          </CardContent>
        </Card>
        {/* The previous right panel (lg:order-2) content is now integrated into the single Card above */}
      </div>


      {/* Modals */}
      <DoubleOfferModal
        isOpen={showDoubleOfferModal}
        onAccept={() => handleRespondToDouble('accept')}
        onDecline={() => handleRespondToDouble('decline')}
        onClose={() => setShowDoubleOfferModal(false)} // Allow closing if needed
        doublingCubeValue={doublingCubeValue}
        opponentName={isMyTurn ? (currentPlayerTurn === 'teal' ? bonePlayerName : tealPlayerName) : (currentPlayerTurn === 'teal' ? tealPlayerName : bonePlayerName)}
      />

      <ResignConfirmModal
        isOpen={showResignConfirm}
        onConfirm={confirmResign}
        onCancel={() => setShowResignConfirm(false)}
      />

      <ShareScreenshotModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        gameSession={gameSession}
        currentUser={user}
      />
    </>
  );
}
