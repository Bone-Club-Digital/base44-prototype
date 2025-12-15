
import React, { useState } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import BackgammonPoint from "./BackgammonPoint";
import BackgammonChecker from "./BackgammonChecker";
import DoublingCube from "./DoublingCube";
import DiceFace from "./DiceFace";
import { RefreshCw } from "lucide-react";
import { motion, LayoutGroup } from "framer-motion";
import ShareScreenshotModal from './ShareScreenshotModal';
import { useUser } from '../auth/UserProvider';

export default function BackgammonBoard({
  position,
  bar = { bone: 0, teal: 0 },
  bornOff = { bone: 0, teal: 0 },
  isPlayerTurn,
  playerColor,
  doublingCube = null,
  showControls = false,
  showDoubleButton = false,
  onRollDice = () => {},
  onOfferDouble = () => {},
  rollDisabled = false,
  diceDisplay = null,
  onUndoMoves = () => {},
  onConfirmTurn = () => {},
  showUndo = false,
  showEndTurn = false,
  endTurnReady = false,
  undoReady = false,
  onCheckerClick = () => {},
  isDoubleBeingOffered = false,
  isPlayerReceivingDouble = false, // This prop is effectively replaced by isDoubleBeingOffered && !isPlayerTurn in button logic
  doubledCubeValue = 2,
  onTakeDouble = () => {},
  onPassDouble = () => {},
  matchState,
  timeLeft = { teal: 0, bone: 0 },
  delaySecondsRemaining = 0,
  currentPlayerTurn,
  formatTime,
  isWaitingForOpponent = false,
  isActionInProgress = false,
  isFirstMove = false,
  onInitialRoll = () => {},
  isInitialTurnForDisplay = false,
  boardLogoUrl,
  selectedPoint,
  validMoves,
  gameSession
}) {
    const [showShareModal, setShowShareModal] = useState(false);
    const { user } = useUser();

    const tealLeatherUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/70360864d_teal9.jpg';
    const leatherStyle = {
        backgroundImage: `url(${tealLeatherUrl})`,
        backgroundSize: '300px', // Controls the scale of the texture
        backgroundRepeat: 'repeat',
    };

    const turquoiseTextureUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/7e6e7b1a1_turquoise1.jpg';
    const turquoiseStyle = {
        backgroundImage: `url(${turquoiseTextureUrl})`,
        backgroundSize: '400px', // Slightly larger scale for the playing area
        backgroundRepeat: 'repeat',
    };

    const opponentColor = playerColor === 'teal' ? 'bone' : 'teal';

    const defaultLogoGraphicUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/e9bb481a7_bone_club_trans.png";
    const logoGraphicUrl = boardLogoUrl || defaultLogoGraphicUrl;

    const calculatePipCount = (color) => {
        let pipCount = 0;
        for (let point = 1; point <= 24; point++) {
            if (position[point] && position[point].color === color) {
                const distance = color === 'bone' ? point : (25 - point);
                pipCount += position[point].count * distance;
            }
        }
        if (bar[color] > 0) {
            pipCount += bar[color] * 25;
        }
        return pipCount;
    };

    const bonePips = calculatePipCount('bone');
    const tealPips = calculatePipCount('teal');

    const renderQuadrant = (points, isTop) => {
        return (
            <div className="flex w-full h-[40%]">
                {points.map(point => (
                    <BackgammonPoint
                        key={point}
                        pointNumber={point}
                        checkers={position[point]}
                        isTop={isTop}
                        isPlayerTurn={isPlayerTurn}
                        playerColor={playerColor}
                        onCheckerClick={onCheckerClick}
                    />
                ))}
            </div>
        );
    };

    const renderBornOffCheckers = (color, count, isTop) => {
        if (count === 0) return null;
        
        const checkers = [];
        const checkerHeight = 4; // % of container height
        const groupGap = 3; // % of container height

        for (let i = 0; i < count; i++) {
            const groupIndex = Math.floor(i / 5);
            const indexInGroup = i % 5;
            const offset = (groupIndex * (5 * checkerHeight + groupGap)) + (indexInGroup * checkerHeight);

            checkers.push(
                <motion.div
                    key={`${color}-bornOff-${i}`}
                    layout
                    layoutId={`checker-${color}-bornOff-${i}`}
                    transition={{ type: "tween", duration: 0.1, ease: "linear" }}
                    className="rounded-sm border shadow-sm"
                    style={{
                        width: '78%',
                        height: `${checkerHeight}%`,
                        backgroundColor: color === 'bone' ? '#F5F5DC' : '#007e81',
                        borderColor: color === 'bone' ? '#bdaa99' : '#005d60',
                        position: 'absolute',
                        [isTop ? 'top' : 'bottom']: `${offset}%`,
                        left: '11%'
                    }}
                />
            );
        }
        
        return checkers;
    };

    const handleBarClick = () => {
        if (isPlayerTurn && bar.teal > 0 && onCheckerClick) {
            onCheckerClick('bar');
        }
    };

    const getButtonState = () => {
        if (isDoubleBeingOffered && !isPlayerTurn) {
            return {
                showButtons: true,
                leftButton: { text: 'TAKE', action: onTakeDouble, style: { backgroundColor: '#007e81', color: 'white' } },
                rightButton: { text: 'PASS', action: onPassDouble, style: { backgroundColor: '#f26222', color: 'white' } }
            };
        }
        
        if (isDoubleBeingOffered && isPlayerTurn) {
            return { showButtons: false };
        }
        
        if (!isPlayerTurn) {
            return { showButtons: false };
        }
        
        if (!diceDisplay || diceDisplay.length === 0) {
            const buttons = [];
            
            const rollButton = {
                text: 'ROLL',
                action: onRollDice,
                disabled: rollDisabled || isActionInProgress,
                style: { backgroundColor: playerColor === 'teal' ? '#007e81' : '#e5e4cd', color: playerColor === 'teal' ? '#e5e4cd' : '#5a3217' }
            };
            
            buttons.push(rollButton);
            
            const currentCubeValue = doublingCube?.value || 1;
            const matchTarget = matchState?.target_score || matchState?.targetScore || 0;
            const canOfferDouble = showDoubleButton && currentCubeValue < matchTarget;
            
            if (canOfferDouble) {
                buttons.push({
                    text: 'DOUBLE',
                    action: onOfferDouble,
                    disabled: isActionInProgress,
                    style: { backgroundColor: '#f26222', color: 'white' }
                });
            }
            
            return {
                showButtons: true,
                leftButton: buttons[0],
                rightButton: buttons[1] || null
            };
        }
        
        if (diceDisplay && diceDisplay.length > 0) {
            const buttons = [];
            
            if (showUndo) {
                buttons.push({
                    text: 'UNDO',
                    action: onUndoMoves,
                    disabled: !undoReady || isActionInProgress,
                    style: { backgroundColor: '#f26222', color: 'white', opacity: undoReady ? 1 : 0.4 }
                });
            }
            
            if (showEndTurn) {
                buttons.push({
                    text: 'END TURN',
                    action: onConfirmTurn,
                    disabled: !endTurnReady || isActionInProgress,
                    style: { backgroundColor: '#007e81', color: 'white', opacity: endTurnReady ? 1 : 0.4 }
                });
            }
            
            return {
                showButtons: buttons.length > 0,
                leftButton: buttons[0] || null,
                rightButton: buttons[1] || null
            };
        }
        
        return { showButtons: false };
    };

    const buttonState = getButtonState();

    // Reusable board content
    const boardContent = (
        <>
            <div className="absolute text-white text-sm font-semibold" style={{ top: '1%', right: '8%', transform: 'translateX(50%)' }}>
                {tealPips}
            </div>
            <div className="absolute text-white text-sm font-semibold" style={{ bottom: '1%', right: '8%', transform: 'translateX(50%)' }}>
                {bonePips}
            </div>

            <div className="bg-[#9fd3ba] shadow-inner flex h-full relative rounded-2xl" style={turquoiseStyle}>
                {/* NEW: Left Bear-Off Area */}
                <div className="w-[8%] flex-shrink-0 flex flex-col items-center relative" style={turquoiseStyle}>
                    <div className="h-1/2 w-full flex flex-col items-center justify-start p-2">
                        <div className="flex-grow w-full relative">
                            {renderBornOffCheckers('bone', bornOff.bone, true)}
                        </div>
                    </div>
                    <div className="h-1/2 w-full flex flex-col items-center justify-end p-2">
                        <div className="flex-grow w-full relative">
                            {renderBornOffCheckers('teal', bornOff.teal, false)}
                        </div>
                    </div>
                </div>

                {/* NEW: Left Leather Separator */}
                <div
                    className="w-[2%] flex-shrink-0"
                    style={leatherStyle}
                ></div>

                {/* SWAPPED: LEFT HALF OF THE BOARD (now with buttons) */}
                <div className="flex flex-col flex-1 justify-between relative">
                    {renderQuadrant([13, 14, 15, 16, 17, 18], true)}
                    {renderQuadrant([12, 11, 10, 9, 8, 7], false)}
                    
                    {/* Centerpiece Container for Buttons/Logo */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-[80%] h-16 md:h-24">
                        {/* Buttons Wrapper */}
                        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ease-in-out ${buttonState.showButtons ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <div className="flex items-center gap-2 md:gap-4 scale-75 md:scale-100">
                                {buttonState.leftButton && (
                                    <Button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (buttonState.leftButton.action && !buttonState.leftButton.disabled) {
                                                buttonState.leftButton.action();
                                            }
                                        }}
                                        disabled={buttonState.leftButton.disabled || false}
                                        className="uppercase font-bold py-3 px-8 rounded-md hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                                        style={{
                                            ...buttonState.leftButton.style,
                                            padding: '12px 24px',
                                            fontSize: '18px',
                                            fontWeight: 'bold',
                                            borderRadius: '8px',
                                            border: 'none',
                                            cursor: buttonState.leftButton.disabled ? 'not-allowed' : 'pointer',
                                            opacity: buttonState.leftButton.disabled ? 0.5 : 1,
                                            transition: 'all 0.2s',
                                            minWidth: '120px',
                                            pointerEvents: 'auto',
                                            zIndex: 10
                                        }}
                                    >
                                        {buttonState.leftButton.text}
                                    </Button>
                                )}
                                {buttonState.rightButton && (
                                    <Button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (buttonState.rightButton.action && !buttonState.rightButton.disabled) {
                                                buttonState.rightButton.action();
                                            }
                                        }}
                                        disabled={buttonState.rightButton.disabled || false}
                                        className="uppercase font-bold py-3 px-8 rounded-md hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                                        style={{
                                            ...buttonState.rightButton.style,
                                            padding: '12px 24px',
                                            fontSize: '18px',
                                            fontWeight: 'bold',
                                            borderRadius: '8px',
                                            border: 'none',
                                            cursor: buttonState.rightButton.disabled ? 'not-allowed' : 'pointer',
                                            opacity: buttonState.rightButton.disabled ? 0.5 : 1,
                                            transition: 'all 0.2s',
                                            minWidth: '120px',
                                            pointerEvents: 'auto',
                                            zIndex: 10
                                        }}
                                    >
                                        {buttonState.rightButton.text}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Logo Wrapper */}
                        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ease-in-out ${(diceDisplay && diceDisplay.length > 0) || buttonState.showButtons ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                            <img 
                                src={logoGraphicUrl} 
                                alt="Game Logo" 
                                className="h-10 md:h-16 lg:h-20 w-auto object-contain"
                            />
                        </div>
                    </div>
                </div>

                {/* CENTER BAR */}
                <div 
                    className="w-[4.8%] flex-shrink-0 mx-[1%] flex flex-col items-center justify-center relative py-2"
                    style={leatherStyle}
                >
                    {isDoubleBeingOffered && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
                            <DoublingCube value={doubledCubeValue} disabled={true} />
                        </div>
                    )}

                    <Droppable droppableId="bar-bone" isDropDisabled={true}>
                        {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="w-full h-1/2 flex flex-col items-center justify-start relative">
                                {Array.from({ length: Math.min(bar.bone, 5) }).map((_, i) => {
                                    const spacing = bar.bone <= 5 ? (i * 15) : (i * 12);
                                    return (
                                        <motion.div
                                            key={`bar-bone-${i}`}
                                            layout
                                            layoutId={`checker-bone-bar-${i}`}
                                            transition={{ type: "tween", duration: 0.1, ease: "linear" }}
                                            className="absolute aspect-square left-1/2 transform -translate-x-1/2"
                                            style={{ top: `${spacing}%`, width: '110%' }}
                                        >
                                            <BackgammonChecker color={opponentColor} />
                                            {bar.bone > 5 && i === 4 && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="rounded-full flex items-center justify-center" style={{ backgroundColor: '#f26222', width: '60%', height: '60%', minWidth: '20px', minHeight: '20px' }}>
                                                        <span className="text-white font-bold text-xs">{bar.bone}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                    <Droppable droppableId="bar-teal">
                        {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="w-full h-1/2 flex flex-col items-center justify-end relative">
                                {Array.from({ length: Math.min(bar.teal, 5) }).map((_, i) => {
                                    const isTopChecker = i === bar.teal - 1;
                                    const spacing = bar.teal <= 5 ? (i * 15) : (i * 12);

                                    if (isTopChecker && isPlayerTurn) {
                                        return (
                                            <Draggable key={`bar-${i}`} draggableId={`checker-bar-${i}`} index={0}>
                                                {(p, dragSnapshot) => (
                                                    <motion.div
                                                        ref={p.innerRef}
                                                        {...p.draggableProps}
                                                        {...p.dragHandleProps}
                                                        layout
                                                        layoutId={`checker-teal-bar-${i}`}
                                                        transition={{ type: "tween", duration: 0.1, ease: "linear" }}
                                                        className="absolute aspect-square left-1/2 cursor-pointer"
                                                        style={{
                                                            bottom: `${spacing}%`,
                                                            width: '110%',
                                                            zIndex: dragSnapshot.isDragging ? 1000 : 10 + i,
                                                            opacity: dragSnapshot.isDragging ? 0.8 : 1,
                                                            transform: `translate(-50%, 0) ${p.draggableProps.style.transform || ''} ${dragSnapshot.isDragging ? 'scale(1.1)' : 'scale(1)'}`,
                                                        }}
                                                        onClick={!dragSnapshot.isDragging ? () => handleBarClick() : undefined}
                                                    >
                                                        <BackgammonChecker color={playerColor} />
                                                        {bar.teal > 5 && i === 4 && (
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <div className="rounded-full flex items-center justify-center" style={{ backgroundColor: '#f26222', width: '60%', height: '60%', minWidth: '20px', minHeight: '20px' }}>
                                                                    <span className="text-white font-bold text-xs">{bar.teal}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </Draggable>
                                        );
                                    }
                                    return (
                                        <motion.div
                                            key={`bar-teal-${i}`}
                                            layout
                                            layoutId={`checker-teal-bar-${i}`}
                                            transition={{ type: "tween", duration: 0.1, ease: "linear" }}
                                            className={`absolute aspect-square left-1/2 transform -translate-x-1/2 ${isTopChecker && isPlayerTurn ? 'cursor-pointer' : ''}`}
                                            style={{ bottom: `${spacing}%`, width: '110%' }}
                                            onClick={isTopChecker && isPlayerTurn ? () => handleBarClick() : undefined}
                                        >
                                            <BackgammonChecker color={playerColor} />
                                            {bar.teal > 5 && i === 4 && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="rounded-full flex items-center justify-center" style={{ backgroundColor: '#f26222', width: '60%', height: '60%', minWidth: '20px', minHeight: '20px' }}>
                                                        <span className="text-white font-bold text-xs">{bar.teal}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </div>

                {/* SWAPPED: RIGHT HALF OF THE BOARD (now with dice) */}
                <div className="flex flex-col flex-1 justify-between relative">
                    {renderQuadrant([19, 20, 21, 22, 23, 24], true)}
                    {renderQuadrant([6, 5, 4, 3, 2, 1], false)}

                    {/* Centerpiece Container for Dice/Logo */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-[60%] md:w-48 h-16 md:h-24">
                        {/* Dice Wrapper */}
                        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ease-in-out ${diceDisplay && diceDisplay.length > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <div className="flex items-center gap-2 md:gap-4">
                                {diceDisplay && diceDisplay.length > 0 && (
                                    diceDisplay.map(d => (
                                        <div 
                                            key={d.id} 
                                            className={`transition-opacity duration-300 ${d.isUsed ? 'opacity-60' : 'opacity-100'}`}
                                        >
                                        <DiceFace value={d.value} playerColor={d.playerColor} isUsed={d.isUsed} />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Logo Wrapper */}
                        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ease-in-out ${(diceDisplay && diceDisplay.length > 0) || buttonState.showButtons ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                            <img 
                                src={logoGraphicUrl} 
                                alt="Game Logo" 
                                className="h-10 md:h-16 lg:h-20 w-auto object-contain"
                            />
                        </div>
                    </div>
                </div>
                
                <div 
                    className="w-[2%] flex-shrink-0"
                    style={leatherStyle}
                ></div>

                <div className="w-[8%] flex-shrink-0 flex flex-col items-center relative" style={turquoiseStyle}>
                    <div className="h-1/2 w-full flex flex-col items-center justify-start p-2">
                        {doublingCube && doublingCube.owner === 'bone' && !isDoubleBeingOffered && (
                            <div className="mb-2">
                                <DoublingCube value={doublingCube.value} onClick={onOfferDouble} disabled={doublingCube.disabled} />
                            </div>
                        )}
                        <div className="flex-grow w-full relative">
                            {renderBornOffCheckers('bone', bornOff.bone, true)}
                        </div>
                    </div>

                    {doublingCube && doublingCube.owner === 'center' && !isDoubleBeingOffered && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                        <DoublingCube value={doublingCube.value} onClick={onOfferDouble} disabled={doublingCube.disabled} />
                    </div>
                    )}

                    <div className="h-1/2 w-full flex flex-col items-center justify-end p-2">
                        <div className="flex-grow w-full relative">
                            {renderBornOffCheckers('teal', bornOff.teal, false)}
                        </div>
                        {doublingCube && doublingCube.owner === 'teal' && !isDoubleBeingOffered && (
                            <div className="mt-2">
                                <DoublingCube value={doublingCube.value} onClick={onOfferDouble} disabled={doublingCube.disabled} />
                            </div>
                        )}
                    </div>
                    
                    <div className="absolute inset-0 z-0">
                        <Droppable droppableId="off-bone" isDropDisabled={true}>
                            {(provided) => <div ref={provided.innerRef} {...provided.droppableProps} className="h-1/2 w-full" />}
                        </Droppable>
                        <Droppable droppableId="off-teal">
                            {(provided) => <div ref={provided.innerRef} {...provided.droppableProps} className="h-1/2 w-full" />}
                        </Droppable>
                    </div>
                </div>
            </div>

            {isWaitingForOpponent && (
                <div className="absolute inset-[3%] bg-black bg-opacity-60 flex flex-col items-center justify-center z-50 rounded-lg">
                    <RefreshCw className="w-12 h-12 animate-spin text-white mb-4" />
                    <p className="text-2xl text-white font-bold uppercase">Waiting for Opponent</p>
                </div>
            )}
        </>
    );

    return (
        <>
            <LayoutGroup>
                <div className="flex flex-col lg:flex-row items-stretch justify-center w-full max-w-7xl mx-auto gap-4">
                    {matchState && (
                        <div className="w-full lg:w-[70px] flex-shrink-0 order-1 lg:order-none flex lg:flex-col items-center justify-around lg:justify-center p-2 lg:p-0 gap-4 hidden lg:flex">
                            <div className={`w-full text-center py-1 text-white text-lg font-oswald ${
                                currentPlayerTurn === opponentColor ? 'bg-[#f26222]' : 'bg-[#d35a20]'
                            }`}>
                                {delaySecondsRemaining > 0 && currentPlayerTurn === opponentColor
                                ? `0:${String(delaySecondsRemaining).padStart(2, '0')}`
                                : formatTime(timeLeft[opponentColor])
                                }
                            </div>
                            {/* Opponent Score */}
                            <div className="w-full aspect-square flex items-center justify-center font-bold text-5xl bg-[#5a3217] text-[#e5e4cd] font-oswald">
                                {playerColor === 'bone' ? matchState.player_teal_score : matchState.player_bone_score}
                            </div>
                            {/* Match Target */}
                            <div className="w-full aspect-square flex items-center justify-center font-bold text-5xl text-[#007e81] bg-[#e5e4cd] border-2 border-[#007e81] my-2 font-oswald">
                                {matchState.targetScore || matchState.target_score}
                            </div>
                            {/* Player Score */}
                            <div className="w-full aspect-square flex items-center justify-center font-bold text-5xl bg-[#5a3217] text-[#e5e4cd] font-oswald">
                                {playerColor === 'bone' ? matchState.player_bone_score : matchState.player_teal_score}
                            </div>
                            <div className={`w-full text-center py-1 text-white text-lg font-oswald ${
                                currentPlayerTurn === playerColor ? 'bg-[#f26222]' : 'bg-[#d35a20]'
                            }`}>
                                {delaySecondsRemaining > 0 && currentPlayerTurn === playerColor
                                ? `0:${String(delaySecondsRemaining).padStart(2, '0')}`
                                : formatTime(timeLeft[playerColor])
                                }
                            </div>
                        </div>
                    )}
                    
                    <div className="flex-1 w-full order-0 lg:order-1">
                        {/* Mobile score panel - left side */}
                        <div className="lg:hidden flex">
                            {matchState && (
                                <div className="w-16 flex-shrink-0 flex flex-col justify-center gap-1">
                                    <div className={`text-center py-1 text-white text-xs font-oswald ${
                                        currentPlayerTurn === opponentColor ? 'bg-[#f26222]' : 'bg-[#d35a20]'
                                    }`}>
                                        {delaySecondsRemaining > 0 && currentPlayerTurn === opponentColor
                                        ? `0:${String(delaySecondsRemaining).padStart(2, '0')}`
                                        : formatTime(timeLeft[opponentColor])
                                        }
                                    </div>
                                    {/* Opponent Score */}
                                    <div className="aspect-square flex items-center justify-center font-bold text-2xl bg-[#5a3217] text-[#e5e4cd] font-oswald">
                                        {playerColor === 'bone' ? matchState.player_teal_score : matchState.player_bone_score}
                                    </div>
                                    {/* Match Target */}
                                    <div className="aspect-square flex items-center justify-center font-bold text-2xl text-[#007e81] bg-[#e5e4cd] border-2 border-[#007e81] font-oswald">
                                        {matchState.targetScore || matchState.target_score}
                                    </div>
                                    {/* Player Score */}
                                    <div className="aspect-square flex items-center justify-center font-bold text-2xl bg-[#5a3217] text-[#e5e4cd] font-oswald">
                                        {playerColor === 'bone' ? matchState.player_bone_score : matchState.player_teal_score}
                                    </div>
                                    <div className={`text-center py-1 text-white text-xs font-oswald ${
                                        currentPlayerTurn === playerColor ? 'bg-[#f26222]' : 'bg-[#d35a20]'
                                    }`}>
                                        {delaySecondsRemaining > 0 && currentPlayerTurn === playerColor
                                        ? `0:${String(delaySecondsRemaining).padStart(2, '0')}`
                                        : formatTime(timeLeft[playerColor])
                                        }
                                    </div>
                                </div>
                            )}
                            
                            {/* Board container */}
                            <div className={`flex-1 ${matchState ? 'ml-2' : ''}`}>
                                <div 
                                    className="relative aspect-[1.6/1] p-[4%] shadow-lg rounded-lg"
                                    style={leatherStyle}
                                    data-game-board
                                >
                                    {boardContent}
                                </div>
                            </div>
                        </div>

                        {/* Desktop layout - keep existing */}
                        <div className="hidden lg:block">
                            <div 
                                className="relative aspect-[1.6/1] p-[4%] shadow-lg rounded-lg"
                                style={leatherStyle}
                                data-game-board
                            >
                                {boardContent}
                            </div>
                        </div>
                    </div>
                </div>
            </LayoutGroup>
            <ShareScreenshotModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                gameSession={gameSession}
                currentUser={user}
            />
        </>
    );
}
