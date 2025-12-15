
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, User, Share2, Smartphone, Flag } from 'lucide-react';
import { DragDropContext } from '@hello-pangea/dnd';

// Backgammon components
import BackgammonBoard from '@/components/backgammon/BackgammonBoard';
// NEW
import MatchChallengeModal from '@/components/backgammon/MatchChallengeModal';
import DoubleOfferModal from '@/components/backgammon/DoubleOfferModal';
import WinnerModal from '@/components/backgammon/WinnerModal';

// Entities
import { GameSession } from '@/entities/GameSession';
// Keeping alias as per current usage context, though outline suggested simple User
import { PlayerStats } from '@/entities/PlayerStats';
import { TournamentMatch } from '@/entities/TournamentMatch';
import { Tournament } from '@/entities/Tournament';
import { Club } from '@/entities/Club';

// Auth/User
import { useUser } from '@/components/auth/UserProvider';

// Functions
import { setPlayerReadyAndStartGame } from '@/functions/setPlayerReadyAndStartGame';
import { startGameAfterOpeningRoll } from '@/functions/startGameAfterOpeningRoll';
import { rollDice } from '@/functions/rollDice';
import { endTurn } from '@/functions/endTurn';
// NEW
// NEW
// NEW
// NEW
import { processGameCompletion } from '@/functions/processGameCompletion';

// Game specific components
import VideoCall from '@/components/video/VideoCall';
import GameConnectionStatus from '@/components/game/GameConnectionStatus';
import SavePositionModal from '@/components/game/SavePositionModal';
import GameChatBox from '@/components/game/GameChatBox';
import ChatModal from '@/components/game/ChatModal';
import FloatingChatIcon from '@/components/game/FloatingChatIcon';


// Standard backgammon starting position
const STARTING_POSITION = {
    1: { color: 'bone', count: 2 },
    6: { color: 'teal', count: 5 },
    8: { color: 'teal', count: 3 },
    12: { color: 'bone', count: 5 },
    13: { color: 'teal', count: 5 },
    17: { color: 'bone', count: 3 },
    19: { color: 'bone', count: 5 },
    24: { color: 'teal', count: 2 },
};


export default function GamePage() {
    const [gameSession, setGameSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [playerColor, setPlayerColor] = useState(null);
    const [opponentColor, setOpponentColor] = useState(null);
    const [gameLog, setGameLog] = useState([]);
    const [timeLeft, setTimeLeft] = useState({ teal: 0, bone: 0 });
    const [delaySecondsRemaining, setDelaySecondsRemaining] = useState(0);
    const [playerInfo, setPlayerInfo] = useState({ tealPlayer: null, bonePlayer: null });
    const [isActionInProgress, setIsActionInProgress] = useState(false);
    const [justEndedTurn, setJustEndedTurn] = useState(false); // NEW: Track if we just ended turn
    const [isInitialTurnForDisplay, setIsInitialTurnForDisplay] = useState(true);
    const [isDoubleOffered, setIsDoubleOffered] = useState(false);
    const [hasAttemptedAutoReady, setHasAttemptedAutoReady] = useState(false);
    const [gameStatus, setGameStatus] = useState(null);
    const [showSavePositionModal, setShowSavePositionModal] = useState(false);
    const [showChatModal, setShowChatModal] = useState(false);
    const [winnerData, setWinnerData] = useState(null); // New state for winner data
    const [showWinnerModal, setShowWinnerModal] = useState(false); // New state variable
    const [showDoubleOfferModal, setShowDoubleOfferModal] = useState(false); // New state for modal control

    const pollingIntervalRef = useRef(null);
    const clockIntervalRef = useRef(null);
    const gameSessionRef = useRef(gameSession);

    const [moveHistory, setMoveHistory] = useState([]);
    const [boardLogoUrl, setBoardLogoUrl] = useState(null);
    const [pendingMoves, setPendingMoves] = useState([]); // Added pendingMoves state

    const timeLeftRef = useRef(timeLeft);
    const delayRef = useRef(delaySecondsRemaining);

    // New state variables for local game logic
    const [localGameState, setLocalGameState] = useState(null);
    const [localMatchState, setLocalMatchState, ] = useState(null); // NEW: To store match_state locally
    const [openingRollWinner, setOpeningRollWinner] = useState(null); // NEW: To store opening roll winner message
    const [hasMoved, setHasMoved] = useState(false);
    const [isRolling, setIsRolling] = useState(false);
    const [hasRolled, setHasRolled] = useState(false);
    const [animatedDice, setAnimatedDice] = useState([]);
    const [canDouble, setCanDouble] = useState(true);

    const { user, loading: userLoading, refetchUser } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const gameId = urlParams.get('id');

    // REMOVED: const { wsUpdate } = useGameWebSocket(gameId); // WebSocket hook removed

    // Error boundary effect to catch and log errors
    useEffect(() => {
        const handleError = (event) => {
            console.error('Game component error:', event.error || event.reason);
            setError(`Game error: ${event.error?.message || event.reason?.message || 'An unexpected error occurred.'}`);
            event.preventDefault();
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleError);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleError);
        };
    }, []);

    // Keep gameSessionRef, timeLeftRef, and delayRef updated
    useEffect(() => {
        gameSessionRef.current = gameSession;
        timeLeftRef.current = timeLeft;
        delayRef.current = delaySecondsRemaining;
    }, [gameSession, timeLeft, delaySecondsRemaining]);

    // Set playerColor and opponentColor states
    useEffect(() => {
        if (user && gameSession) {
            if (gameSession.player_teal_id === user.id) {
                setPlayerColor('teal');
                setOpponentColor('bone');
            } else if (gameSession.player_bone_id === user.id) {
                setPlayerColor('bone');
                setOpponentColor('teal');
            }
        }
    }, [user, gameSession]);

    // Set isDoubleOffered state based on gameSession, and control DoubleOfferModal visibility
    useEffect(() => {
        if (gameSession?.game_state && playerColor && opponentColor) { // Ensure playerColor/opponentColor are set
            const doubleOfferedInGameState = gameSession.game_state.isDoubleOffered || false;
            setIsDoubleOffered(doubleOfferedInGameState);

            // If a double is offered in the game state, and it's *not* my turn (meaning opponent offered it)
            // then I (the current player) need to respond. Show the modal to myself.
            if (doubleOfferedInGameState && gameSession.current_player_turn === opponentColor) {
                setShowDoubleOfferModal(true);
            } else {
                setShowDoubleOfferModal(false); // Hide if not offered or it's my turn
            }
        } else {
            setShowDoubleOfferModal(false); // Hide if game state is not ready
        }
    }, [gameSession, playerColor, opponentColor]);

    // Initialize/update localGameState when gameSession.game_state changes
    useEffect(() => {
        if (gameSession?.game_state) {
            setLocalGameState(gameSession.game_state);
            // Reset hasRolled if it's not our turn or dice are cleared
            if (gameSession.current_player_turn !== playerColor || !gameSession.game_state.movesRemaining || gameSession.game_state.movesRemaining.length === 0) {
                setHasRolled(false);
                setAnimatedDice([]);
            }
            // Determine if double can be offered
            setCanDouble(gameSession.game_state.doubling_cube?.owner !== opponentColor && !gameSession.game_state.isDoubleOffered);
        }
    }, [gameSession?.game_state, gameSession?.current_player_turn, playerColor, opponentColor]);

    const isMyTurn = playerColor && gameSession?.status === 'in_progress' && gameSession?.current_player_turn === playerColor;

    useEffect(() => {
        if (gameSession?.status === 'in_progress' && gameSession?.match_state?.use_clock) {
            setDelaySecondsRemaining(gameSession.match_state.increment_seconds || 12);
        }
    }, [gameSession]);


    // New function to check for a win and process it
    const checkForWinAndComplete = useCallback(async (newState) => {
        if (!newState || !gameSessionRef.current || !user) return;

        const currentSession = gameSessionRef.current;
        const myColor = currentSession.player_teal_id === user.id ? 'teal' : 'bone';
        
        if (newState.bornOff && newState.bornOff[myColor] >= 15) {
            // If the current gameSession status is already completed, don't re-process
            if (currentSession.status === 'completed') {
                console.log("Game already completed, skipping checkForWinAndComplete processing.");
                return;
            }

            console.log(`Player ${myColor} has borne off 15 checkers. Processing game completion...`);
            setGameStatus('Game over! Processing results...');
            setIsActionInProgress(true); // Lock UI

            try {
                // Ensure gameId is available and valid
                if (!currentSession.id) {
                    throw new Error("Game ID not available for completion processing.");
                }

                // Call the new backend function to handle game completion
                const { data } = await processGameCompletion({ gameId: currentSession.id });
                
                // Store results for the modal. The polling will eventually update gameSession status to 'completed'.
                setWinnerData(data); 
                setShowWinnerModal(true); // Trigger the WinnerModal here

                // Optimistically update game status if the process completes successfully
                // (Though polling will ultimately confirm this)
                setGameSession(prev => ({ ...prev, status: 'completed', winner_id: user.id }));

            } catch(e) {
                console.error("Failed to process game completion:", e);
                setError("There was an error finalizing the game results. Please refresh.");
                setGameStatus('Error processing results.');
            } finally {
                setIsActionInProgress(false);
            }
        }
    }, [user, gameSessionRef, setGameSession, setError, setGameStatus, setWinnerData, setShowWinnerModal]);


    const handlePlayerReady = async () => {
        if (isActionInProgress || !gameId) return;
        setIsActionInProgress(true);
        try {
            await setPlayerReadyAndStartGame({ gameId: gameId, ready: true });
            // The polling mechanism will pick up the game state change,
            // including the automated opening roll outcome from the backend.
        } catch (error) {
            console.error("Error during player ready (initial roll):", error);
            setError(`Error starting match: ${error.message}`);
        } finally {
            setIsActionInProgress(false);
        }
    };

    const handleStartGameAfterRoll = async () => {
        if (gameId && user && localGameState?.is_opening_move) {
            try {
                // Call the new backend function to transition to the first turn
                await startGameAfterOpeningRoll({ gameId });
                setOpeningRollWinner(null); // Clear the message after starting
            } catch (error) {
                console.error("Error starting game after opening roll:", error);
                setError("Could not start the game. Please try refreshing.");
            }
        }
    };


    const handleRollDice = useCallback(async () => {
        const currentGameId = gameId;
        
        if (!isMyTurn || isActionInProgress || !currentGameId) {
            return;
        }

        setIsActionInProgress(true);
        setError(null);
        
        try {
            const response = await rollDice({ gameId: currentGameId });
            const gameData = response?.data?.data || response?.data;
            
            if (gameData) {
                setGameSession(gameData);
                setLocalGameState(gameData.game_state);
                setLocalMatchState(gameData.match_state);
                setHasRolled(true);
                
                const rolled = gameData.game_state?.dice;
                if (rolled && rolled.length === 2) {
                    setAnimatedDice(rolled);
                }
            }
        } catch (error) {
            console.error("[handleRollDice] Error:", error);
            setError(`Failed to roll dice: ${error.message}`);
        } finally {
            setIsActionInProgress(false);
        }
    }, [isMyTurn, isActionInProgress, gameId]);


    // Initial data fetch
    useEffect(() => {
        const loadGame = async () => {
            if (!gameId || userLoading) {
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const session = await GameSession.get(gameId);

                if (!session) {
                    throw new Error('Game session not found');
                }

                setGameSession(session);
                setLocalMatchState(session.match_state); // Initialize localMatchState
                setLocalGameState(session.game_state); // Initialize localGameState from fetched session

                // Fetch player info
                const [tealPlayer, bonePlayer] = await Promise.all([
                    session.player_teal_id ? PlayerStats.filter({ user_id: session.player_teal_id }) : Promise.resolve([]),
                    session.player_bone_id ? PlayerStats.filter({ user_id: session.player_bone_id }) : Promise.resolve([])
                ]);

                setPlayerInfo({
                    tealPlayer: tealPlayer[0] || null,
                    bonePlayer: bonePlayer[0] || null
                });

            } catch (err) {
                console.error('[Game] Error loading game:', err);
                const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
                setError(`Failed to load game: ${errorMessage}`);
                if (err.response?.status === 404 || err.message?.includes('not found')) {
                    setTimeout(() => navigate(createPageUrl('Home')), 3000);
                }
            } finally {
                setLoading(false);
            }
        };

        loadGame();
    }, [gameId, userLoading, user, navigate]);


    // Simplified polling for game updates - with correct dependencies
    useEffect(() => {
        if (userLoading || !gameId || !user) return;

        const pollInterval = setInterval(async () => {
            try {
                const updatedGame = await GameSession.get(gameId);
                if (updatedGame) {
                    // No logging needed here, as per instructions.

                    // Check if turn changed
                    const previousTurn = gameSessionRef.current?.game_state?.turn;
                    const newTurn = updatedGame.game_state?.turn;
                    
                    // Update all game state from polling
                    setGameSession(updatedGame);
                    setLocalGameState(updatedGame.game_state);
                    setLocalMatchState(updatedGame.match_state);
                    
                    // CRITICAL: Always clear action in progress on polling
                    if (isActionInProgress) {
                        // No logging needed here, as per instructions.
                        setIsActionInProgress(false);
                    }
                    
                    // If turn changed to ME, reset everything
                    if (previousTurn !== newTurn && newTurn === playerColor) {
                        // No logging needed here, as per instructions.
                        setHasRolled(false);
                        setAnimatedDice([]);
                        setPendingMoves([]);
                        setMoveHistory([]);
                        setHasMoved(false);
                        setJustEndedTurn(false);
                        setIsActionInProgress(false); // Ensure it's cleared
                    }
                    
                    // Clear move state when not our turn
                    if (newTurn && newTurn !== playerColor) {
                        // No logging needed here, as per instructions.
                        setPendingMoves([]);
                        setMoveHistory([]);
                        setHasMoved(false);
                        setHasRolled(false);
                        setAnimatedDice([]);
                    }
                    
                    setTimeLeft({
                        teal: updatedGame.match_state?.player_teal_time_remaining || 0,
                        bone: updatedGame.match_state?.player_bone_time_remaining || 0
                    });

                    setIsInitialTurnForDisplay(!!updatedGame.game_state?.is_opening_move);

                    // Fetch club logo for tournament games if tournament_id is present
                    if (updatedGame.tournament_id) {
                        if (!boardLogoUrl || (gameSessionRef.current?.tournament_id !== updatedGame.tournament_id)) {
                            const tournament = await Tournament.get(updatedGame.tournament_id);
                            if (tournament.club_id) {
                                const club = await Club.get(tournament.club_id);
                                if (club.logo_url) {
                                    setBoardLogoUrl(club.logo_url);
                                }
                            }
                        }
                    } else if (boardLogoUrl) {
                         setBoardLogoUrl(null);
                    }
                }
            } catch (error) {
                console.warn('[Polling] Error:', error.message);
                // Also clear action in progress on polling error to prevent UI getting stuck
                setIsActionInProgress(false);
                if (error.response?.status === 404 || error.response?.status === 500) {
                    clearInterval(pollInterval);
                }
            }
        }, 2000);

        return () => clearInterval(pollInterval);
    }, [userLoading, gameId, user, playerColor, isActionInProgress, boardLogoUrl, navigate, setGameSession, setLocalGameState, setLocalMatchState, gameSessionRef, hasRolled]);

    // REMOVED: WebSocket update effect

    // Unified game completion handling to fetch winnerData
    useEffect(() => {
        if (!gameSession || !user || gameSession.status !== 'completed' || winnerData) return;

        const finalizeGameResults = async () => {
            console.log("Game completed, but winnerData not yet set. Fetching final results.");
            setGameStatus('Match complete! Finalizing results...');
            setIsActionInProgress(true); // Lock UI while fetching results

            try {
                const { data } = await processGameCompletion({ gameId: gameSession.id });
                setWinnerData(data); // Store results for the modal
                setShowWinnerModal(true); // Trigger the WinnerModal here
                console.log("Final game results fetched:", data);
                await refetchUser(); // Ensure user data (bones, etc.) is updated
            } catch (error) {
                console.error('Error finalizing game results:', error);
                setError('Failed to fetch final game results. Please refresh.');
                setGameStatus('Error finalizing results.');
            } finally {
                setIsActionInProgress(false);
            }
        };

        finalizeGameResults();
    }, [gameSession, user, winnerData, gameId, setError, setGameStatus, setIsActionInProgress, setWinnerData, refetchUser, setShowWinnerModal]);

    // Effect to handle the result of the opening roll
    useEffect(() => {
        if (gameSession?.status === 'starting' && localGameState?.is_opening_move && localGameState.opening_rolls) {
            // Ensure both players have rolled before determining a winner
            if (localGameState.opening_rolls.teal === undefined || localGameState.opening_rolls.teal === 0 ||
                localGameState.opening_rolls.bone === undefined || localGameState.opening_rolls.bone === 0) {
                setOpeningRollWinner("Waiting for both players to roll their opening dice...");
                return;
            }

            // Both have rolled, determine winner based on `current_player_turn` from gameSession
            const winnerColor = gameSession.current_player_turn; // This is the actual winner determined by backend
            const winnerUsername = winnerColor === 'teal'
                ? playerInfo.tealPlayer?.username
                : playerInfo.bonePlayer?.username;

            if (winnerUsername) {
                setOpeningRollWinner(`${winnerUsername} won the roll and will play first.`);
            }
        } else {
            setOpeningRollWinner(null); // Clear if not in opening roll phase
        }
    }, [gameSession, localGameState, playerInfo, user]);


    const handleCancelMatch = async () => {
        if (!gameSession || isActionInProgress) return;

        setIsActionInProgress(true);
        try {
            await GameSession.delete(gameSession.id);

            if (gameSession.tournament_match_id) {
                await TournamentMatch.update(gameSession.tournament_match_id, {
                    status: 'cancelled',
                });
            }
            navigate(createPageUrl('Home'));
        } catch (error) {
            console.error(`Failed to cancel match:`, error);
        } finally {
            setIsActionInProgress(false);
        }
    };

    const handleResign = async () => {
        if (!window.confirm('Are you sure you want to resign? This will end the match immediately and count as a loss.')) {
            return;
        }

        setGameStatus('Processing resignation...');
        setIsActionInProgress(true);

        try {
            const opponentId = playerColor === 'teal' ? gameSession.player_bone_id : gameSession.player_teal_id;
            const targetScore = gameSession.match_state?.target_score || 7;

            const newMatchState = {
                ...(gameSession.match_state || {}),
                player_teal_score: playerColor === 'teal' ? (gameSession.match_state?.player_teal_score || 0) : targetScore,
                player_bone_score: playerColor === 'bone' ? (gameSession.match_state?.player_bone_score || 0) : targetScore,
            };

            await GameSession.update(gameId, {
                status: 'completed',
                winner_id: opponentId,
                match_state: newMatchState
            });

            setGameStatus('Match resigned. Finalising results...');

        } catch (error) {
            console.error('[Game] Resignation error:', error);
            setGameStatus('Error processing resignation. Please try again.');
        } finally {
            setIsActionInProgress(false);
        }
    };

    const isPlayerTurnFunc = () => {
        return playerColor && gameSession?.status === 'in_progress' && gameSession?.current_player_turn === playerColor;
    };

    // Helper to convert display point (what board renders) to canonical point (internal game logic)
    const toCanonicalPoint = (displayPoint) => {
        if (displayPoint === 0) { // Born-off point for bone player, or bar point for bone player (display 0)
            return playerColor === 'bone' ? 'bar' : 0; // Canonical bar for bone, canonical born-off for teal
        }
        if (displayPoint === 25) { // Born-off point for teal player, or bar point for teal player (display 25)
            return playerColor === 'teal' ? 'bar' : 25; // Canonical bar for teal, canonical born-off for bone
        }
        // Regular board points: bone player sees board reversed
        return (playerColor === 'bone') ? (25 - displayPoint) : displayPoint;
    };

    // Helper to convert canonical point (internal game logic) to display point (what board renders)
    const toDisplayPoint = (canonicalPoint) => {
        if (canonicalPoint === 'bar') {
            return playerColor === 'teal' ? 25 : 0; // Teal's bar is display 25, Bone's bar is display 0
        }
        if (canonicalPoint === 0) return (playerColor === 'teal' ? 0 : 25); // Canonical 0 is born-off for teal. For bone, born-off is canonical 25, which maps to display 0.
        if (canonicalPoint === 25) return (playerColor === 'bone' ? 0 : 25); // Canonical 25 is born-off for bone. For teal, born-off is canonical 0, which maps to display 25.
        // Regular board points
        return (playerColor === 'bone') ? (25 - canonicalPoint) : canonicalPoint;
    };

    const applyMove = useCallback((currentGameState, source, dest, dieValue, playerColorForMove) => {
        const newGameState = JSON.parse(JSON.stringify(currentGameState));
        const { board, bar, bornOff } = newGameState; // Use bornOff

        const opponentColorForMove = playerColorForMove === 'teal' ? 'bone' : 'teal';

        if (source === 'bar') {
            if (bar[playerColorForMove] > 0) {
                bar[playerColorForMove]--;
            } else {
                throw new Error("Trying to move from bar but no checkers on bar!");
            }
        } else {
            if (board[source] && board[source].count > 0) {
                board[source].count--;
                if (board[source].count === 0) {
                    delete board[source];
                }
            } else {
                throw new Error("Trying to move from empty point or invalid point!");
            }
        }

        if (dest === 0 || dest === 25) { // Canonical born-off points
            bornOff[playerColorForMove]++; // Increment bornOff
        } else {
            if (board[dest] && board[dest].color === opponentColorForMove && board[dest].count === 1) {
                bar[opponentColorForMove]++;
                board[dest] = { color: playerColorForMove, count: 1 };
            } else if (board[dest] && board[dest].color === playerColorForMove) {
                board[dest].count++;
            } else if (!board[dest]) {
                newGameState.board[dest] = { color: playerColorForMove, count: 1 };
            } else if (board[dest] && board[dest].color === opponentColorForMove && board[dest].count > 1) {
                throw new Error("Move blocked: Destination is occupied by more than one opponent checker.");
            } else {
                throw new Error("Invalid destination - unexpected condition.");
            }
        }

        const moveIndex = newGameState.movesRemaining.indexOf(dieValue);
        if (moveIndex > -1) {
            newGameState.movesRemaining.splice(moveIndex, 1);
        } else {
             throw new Error(`Die value ${dieValue} not found in movesRemaining or already used.`);
        }

        const validateCheckerCount = (color) => {
            let total = 0;
            for (let point = 1; point <= 24; point++) {
                if (newGameState.board[point] && newGameState.board[point].color === color) {
                    total += newGameState.board[point].count;
                }
            }
            total += newGameState.bar[color];
            total += newGameState.bornOff[color]; // Use bornOff
            return total;
        };

        const tealTotal = validateCheckerCount('teal');
        const boneTotal = validateCheckerCount('bone');

        if (tealTotal !== 15 || boneTotal !== 15) {
            console.error(`Checker count error! Teal: ${tealTotal}, Bone: ${boneTotal}.`);
            throw new Error(`Invalid checker count detected. Teal: ${tealTotal}, Bone: ${boneTotal}.`);
        }

        return newGameState;
    }, []);

    // Add canPlayerBearOff helper function
    const canPlayerBearOff = useCallback((playerColorArgument, gameState) => {
        if (!gameState || !gameState.board) return false;

        const bar = gameState.bar || { teal: 0, bone: 0 };
        if (bar[playerColorArgument] > 0) return false; // Must clear bar first

        const homeBoardStart = playerColorArgument === 'teal' ? 1 : 19; // Points 1-6 for teal
        const homeBoardEnd = playerColorArgument === 'teal' ? 6 : 24; // Points 19-24 for bone

        for (let i = 1; i <= 24; i++) {
            if (gameState.board[i] && gameState.board[i].color === playerColorArgument) {
                // If any checker is outside the home board
                if ((playerColorArgument === 'teal' && i > homeBoardEnd) || (playerColorArgument === 'bone' && i < homeBoardStart)) {
                    return false;
                }
            }
        }
        return true; // All checkers are in the home board
    }, []);

    const isValidMove = useCallback((canonicalFrom, canonicalTo, dieValue, gameState) => {
        // console.log(`[isValidMove] Checking move from ${canonicalFrom} to ${canonicalTo} with die ${dieValue}`);
        try {
            // Attempt to apply the move to a deep copy of the game state
            const tempGameState = JSON.parse(JSON.stringify(gameState));
            applyMove(tempGameState, canonicalFrom, canonicalTo, dieValue, playerColor);
            // console.log(`[isValidMove] Move from ${canonicalFrom} to ${canonicalTo} with die ${dieValue} appears VALID.`);
            return true; // If applyMove doesn't throw an error, it's a valid move
        } catch (e) {
            // console.log(`[isValidMove] Move from ${canonicalFrom} to ${canonicalTo} with die ${dieValue} is INVALID: ${e.message}`);
            return false;
        }
    }, [applyMove, playerColor]);
    
    // NEW HELPER: Find all legal moves for the current player with the current dice
    const findAllLegalMoves = useCallback((gameState) => {
        if (!gameState || !gameState.movesRemaining || gameState.movesRemaining.length === 0 || !playerColor) {
            return [];
        }

        const allMoves = [];
        // Filter out used dice (0s) and sort in descending order for consistency
        const dice = gameState.movesRemaining.filter(d => d > 0).sort((a, b) => b - a);
        const bar = gameState.bar || { teal: 0, bone: 0 };
        const board = gameState.board;
        const direction = playerColor === 'teal' ? -1 : 1;

        // 1. Check moves from bar if checkers are on it
        if (bar[playerColor] > 0) {
            const barCanonicalPoint = 'bar'; // Canonical representation for bar
            dice.forEach(die => {
                const entryPoint = playerColor === 'teal' ? (25 - die) : die; // Canonical board point
                if (isValidMove(barCanonicalPoint, entryPoint, die, gameState)) {
                    allMoves.push({ from: barCanonicalPoint, to: entryPoint, die });
                }
            });
            // If moves from bar are possible, no other moves are legal (rule of backgammon)
            if (allMoves.length > 0) return allMoves;
        }

        // 2. Check moves from the board points
        for (let point = 1; point <= 24; point++) {
            const pointState = board[point];
            if (pointState && pointState.color === playerColor && pointState.count > 0) {
                const canonicalFromPoint = point; // Already canonical

                dice.forEach(die => {
                    let canonicalToPoint = canonicalFromPoint + (die * direction);

                    // Check for bear-off moves
                    if ((playerColor === 'teal' && canonicalToPoint < 1) || (playerColor === 'bone' && canonicalToPoint > 24)) {
                        if (canPlayerBearOff(playerColor, gameState)) {
                            // When bearing off from a board point, sourcePipValue is the point's value in the player's direction
                            const sourcePipValue = (playerColor === 'teal' ? canonicalFromPoint : 25 - canonicalFromPoint);
                            
                            if (sourcePipValue === die) {
                                canonicalToPoint = playerColor === 'teal' ? 0 : 25; // Exact bear-off
                            } else if (sourcePipValue < die) {
                                // Overshoot case: check if it's the highest checker on the board (closest to bearing off)?
                                let higherCheckerExists = false;
                                for (let i = 1; i <= 24; i++) {
                                    if (board[i] && board[i].color === playerColor) {
                                        const pipVal = playerColor === 'teal' ? i : 25 - i;
                                        if (pipVal > sourcePipValue) {
                                            higherCheckerExists = true;
                                            break;
                                        }
                                    }
                                }
                                if (!higherCheckerExists) {
                                    canonicalToPoint = playerColor === 'teal' ? 0 : 25; // Overshoot bear-off
                                } else {
                                    return; // Cannot bear off with this die due to higher checkers
                                }
                            } else {
                                return; // Cannot bear off with this die (too small)
                            }
                        } else {
                            return; // Cannot bear off yet
                        }
                    }
                    
                    if (isValidMove(canonicalFromPoint, canonicalToPoint, die, gameState)) {
                        allMoves.push({ from: canonicalFromPoint, to: canonicalToPoint, die });
                    }
                });
            }
        }
        return allMoves;
    }, [playerColor, isValidMove, canPlayerBearOff]); // Add dependencies for useCallback

    const handleEndTurn = useCallback(async () => {
        console.log('[handleEndTurn] Called');
        
        if (!isMyTurn || isActionInProgress) {
            console.log('[handleEndTurn] Blocked - not my turn or action in progress');
            return;
        }

        setIsActionInProgress(true);
        setJustEndedTurn(true); // Set flag to prevent roll button flash
        
        try {
            const response = await endTurn({ gameId });
            console.log('[handleEndTurn] Turn ended successfully', response.data);
            
            // Clear local state
            setPendingMoves([]);
            setMoveHistory([]);
            setHasMoved(false);
            setHasRolled(false);
            setAnimatedDice([]);
            
            // Fetch updated game state
            const updatedGame = await GameSession.get(gameId);
            setGameSession(updatedGame);
            setLocalGameState(updatedGame.game_state);
            setLocalMatchState(updatedGame.match_state);
            
            setGameLog(prev => [...prev, "Turn ended. Opponent's turn."]);
            
            // Keep justEndedTurn flag for 3 seconds to prevent flash
            setTimeout(() => {
                setJustEndedTurn(false);
            }, 3000);
            
        } catch (error) {
            console.error('[handleEndTurn] Error:', error);
            setError(`Failed to end turn: ${error.message}`);
            setJustEndedTurn(false); // Clear on error
        } finally {
            setIsActionInProgress(false);
        }
    }, [gameId, isMyTurn, isActionInProgress, setError, setPendingMoves, setMoveHistory, setHasMoved, setHasRolled, setAnimatedDice, setGameSession, setLocalGameState, setLocalMatchState, setGameLog, setIsActionInProgress, setJustEndedTurn]);


    // useEffect to check for no possible moves and automate turn passing
    useEffect(() => {
        // Only run if it's my turn, dice are rolled, and moves are available to check
        if (isMyTurn && localGameState && hasRolled && localGameState.movesRemaining && localGameState.movesRemaining.length > 0) {
            const legalMoves = findAllLegalMoves(localGameState);
            if (legalMoves.length === 0) {
                console.log("[useEffect] No legal moves detected. Automatically passing turn in 2 seconds.");
                setGameLog(prev => [...prev, `${playerColor} has no possible moves. Passing turn.`] );
                
                // Prevent multiple timers
                if (!isActionInProgress) {
                    setIsActionInProgress(true); // Lock actions while auto-passing
                    setTimeout(() => {
                        handleEndTurn(); // This function ends the turn
                    }, 2000);
                }
            }
        }
    }, [isMyTurn, localGameState, hasRolled, findAllLegalMoves, isActionInProgress, playerColor, setGameLog, handleEndTurn]);


    const handleMove = async (canonicalFrom, canonicalTo, dieValue) => {
        console.log(`[handleMove] Executing move from ${canonicalFrom} to ${canonicalTo} with die ${dieValue}`);
        if (!isMyTurn || isActionInProgress) {
            console.log('[handleMove] Aborted: Not my turn or action in progress.');
            return;
        }
        setIsActionInProgress(true);
        setError(null);

        try {
            // Apply the move locally using the existing helper function
            const nextGameState = applyMove(localGameState, canonicalFrom, canonicalTo, dieValue, playerColor);

            // Optimistic update
            setLocalGameState(nextGameState);
            setMoveHistory(prev => [...prev, localGameState]); // Save current state to history for undo
            setHasMoved(true); // Indicate that a move has been initiated

            // Update the game session on the backend
            await GameSession.update(gameId, {
                game_state: nextGameState
            });

            setGameLog(prev => [...prev, `${playerColor === 'teal' ? 'Teal' : 'Bone'} moved from ${toDisplayPoint(canonicalFrom)} to ${toDisplayPoint(canonicalTo)} using ${dieValue}.`]);

            console.log(`[handleMove] Move executed successfully!`);

            // NOW, check for a win condition
            await checkForWinAndComplete(nextGameState);
            
        } catch (error) {
            console.error('[handleMove] Error executing move:', error);
            setError(`Move failed: ${error.message}`);
            // Revert local state if API call fails (this will be picked up by polling eventually)
            setLocalGameState(localGameState);
            setHasMoved(false);
        } finally {
            setIsActionInProgress(false);
        }
    };

    const handleBoardClick = async (displayPointClicked) => {
        console.log(`[handleBoardClick] Board clicked at display point: ${displayPointClicked}. My turn: ${isMyTurn}. In progress: ${isActionInProgress}. Has Rolled: ${hasRolled}. GameState.movesRemaining: ${localGameState?.movesRemaining?.length}`);
        
        // SIMPLIFIED AND CORRECTED CHECK:
        // 1. Is it my turn?
        // 2. Is an action already in progress?
        // 3. Is there a game state with moves to make?
        if (!isMyTurn || isActionInProgress || !localGameState || !localGameState.movesRemaining || localGameState.movesRemaining.length === 0) {
            console.log('[handleBoardClick] Aborting: Not my turn, action in progress, no game state, or no moves remaining in game state.');
            return;
        }

        const availableDice = [...(localGameState.movesRemaining || [])].sort((a, b) => b - a); // Sort highest first
        console.log(`[handleBoardClick] Valid turn. Available dice: [${availableDice.join(', ')}]`);

        const bar = localGameState.bar || { teal: 0, bone: 0 };
        let canonicalSourcePoint = null;

        const barDisplayPoint = (playerColor === 'teal' ? 25 : 0); // Display point for player's bar
        const canonicalBarPoint = 'bar'; // Canonical representation of player's bar

        // If checkers are on the bar, the player MUST move from the bar.
        if (bar[playerColor] > 0) {
            // Player must click on their bar to initiate a move from it.
            if (displayPointClicked === barDisplayPoint) {
                canonicalSourcePoint = canonicalBarPoint;
            } else {
                setGameLog(prev => [...prev, "You must move checkers from the bar first."]);
                console.log(`[handleBoardClick] Aborting: Must move from bar first. Clicked display point: ${displayPointClicked}, Bar display point: ${barDisplayPoint}.`);
                return;
            }
        } else {
            // No checkers on bar, so player must click on one of their checkers on the board.
            const canonicalClickedPoint = toCanonicalPoint(displayPointClicked);
            const pointState = localGameState.board[canonicalClickedPoint];
            if (pointState && pointState.color === playerColor && pointState.count > 0) {
                canonicalSourcePoint = canonicalClickedPoint;
            } else {
                setGameLog(prev => [...prev, "No checker of your color at this point to move."]);
                console.log(`[handleBoardClick] Aborting: No checker of your color at clicked display point ${displayPointClicked}.`);
                return;
            }
        }

        if (canonicalSourcePoint === null) {
            console.warn("[handleBoardClick] Could not determine canonical source point for click:", displayPointClicked);
            return;
        }

        console.log(`[handleBoardClick] Attempting to find move for checker at canonical point ${canonicalSourcePoint}.`);

        const direction = playerColor === 'teal' ? -1 : 1;

        // Iterate through available dice to find the first valid move
        for (const dieValue of availableDice) {
            let potentialCanonicalDestPoint;
            
            if (canonicalSourcePoint === 'bar') {
                potentialCanonicalDestPoint = playerColor === 'teal' ? (25 - dieValue) : dieValue; // Canonical entry point for bar
            } else {
                potentialCanonicalDestPoint = canonicalSourcePoint + (dieValue * direction);
            }

            // Check for bear-off logic (overshoot or exact)
            if ((playerColor === 'teal' && potentialCanonicalDestPoint < 1) || (playerColor === 'bone' && potentialCanonicalDestPoint > 24)) {
                if (canPlayerBearOff(playerColor, localGameState)) {
                    // When bearing off, the sourcePipValue needs to be considered.
                    // For bar, it's 0. For board points, it's the canonical point transformed.
                    const sourcePipValue = canonicalSourcePoint === 'bar' ? 0 : (playerColor === 'teal' ? canonicalSourcePoint : 25 - canonicalSourcePoint);
                    
                    if (sourcePipValue === dieValue) {
                        potentialCanonicalDestPoint = playerColor === 'teal' ? 0 : 25; // Exact bear-off
                    } else if (sourcePipValue < dieValue) { // Overshoot case
                        let higherCheckerExists = false;
                        if (canonicalSourcePoint !== 'bar') { // Only check for higher checkers if not moving from bar
                            for (let i = 1; i <= 24; i++) {
                                if (localGameState.board[i] && localGameState.board[i].color === playerColor) {
                                    const pipVal = playerColor === 'teal' ? i : 25 - i;
                                    if (pipVal > sourcePipValue) {
                                        higherCheckerExists = true;
                                        break;
                                    }
                                }
                            }
                        }
                        if (!higherCheckerExists) {
                            potentialCanonicalDestPoint = playerColor === 'teal' ? 0 : 25; // Overshoot bear-off
                        } else {
                            continue; // This die value cannot be used for bear-off due to higher checkers
                        }
                    } else {
                        continue; // Cannot bear off with this die (too small)
                    }
                } else {
                    continue; // Cannot bear off yet
                }
            }
            
            // Now, check if potentialCanonicalDestPoint is a VALID target given the rules (blocked, etc.)
            if (isValidMove(canonicalSourcePoint, potentialCanonicalDestPoint, dieValue, localGameState)) {
                console.log(`[handleBoardClick] FOUND VALID MOVE to canonical point ${potentialCanonicalDestPoint} using die ${dieValue}. Executing.`);
                handleMove(canonicalSourcePoint, potentialCanonicalDestPoint, dieValue);
                return; // Execute the first valid move and stop.
            }
        }
        
        console.log(`[handleBoardClick] No valid single move found for checker at canonical point ${canonicalSourcePoint} with any available die.`);
        setGameLog(prev => [...prev, `No legal single move found for checker at ${displayPointClicked} with available dice.`]);
    };

    const handlePointClick = (targetDisplayPoint) => {
        console.log(`[handlePointClick] Clicked on display point ${targetDisplayPoint}.`);
        handleBoardClick(targetDisplayPoint);
    };

    const handleCheckerClick = (displayPoint) => {
        console.log(`[handleCheckerClick] Clicked on checker at display point ${displayPoint}.`);
        handleBoardClick(displayPoint);
    };


    const handleDragEnd = async (result) => {
        if (!isPlayerTurnFunc() || !result.destination || isActionInProgress || !localGameState || !hasRolled) return;

        setIsActionInProgress(true);
        setError(null);

        const { source, destination } = result;

        let canonicalSourcePoint;
        if (source.droppableId.startsWith('bar')) {
            canonicalSourcePoint = 'bar';
        } else {
            const displaySourcePoint = parseInt(source.droppableId.split('-')[1]);
            canonicalSourcePoint = toCanonicalPoint(displaySourcePoint);
        }

        let canonicalDestPoint;
        if (destination.droppableId.startsWith('off')) {
            // Born-off points are 0 or 25 canonically
            canonicalDestPoint = playerColor === 'teal' ? 0 : 25;
        } else if (destination.droppableId.startsWith('point')) {
            const displayDestPoint = parseInt(destination.droppableId.split('-')[1]);
            canonicalDestPoint = toCanonicalPoint(displayDestPoint);
        } else {
            setGameLog(prev => [...prev, "Invalid drag destination."]);
            setIsActionInProgress(false);
            return;
        }

        // Determine the die value used for this specific drag move
        const availableDice = [...(localGameState.movesRemaining || [])];
        let usedDieValue = null;

        // Iterate through available dice to find which one enables this specific move
        // Prioritize moves that fully use the die first, then consider overshooting if bearing off
        for (const die of availableDice) {
            // For regular moves or exact bear-off
            if (isValidMove(canonicalSourcePoint, canonicalDestPoint, die, localGameState)) {
                usedDieValue = die;
                break; // Found the die
            }
        }

        if (usedDieValue === null) {
            setGameLog(prev => [...prev, `Invalid move: From ${toDisplayPoint(canonicalSourcePoint)} to ${toDisplayPoint(canonicalDestPoint)} is not a legal move with available dice.`]);
            setIsActionInProgress(false);
            return;
        }
        
        // Execute the move using the found die value
        handleMove(canonicalSourcePoint, canonicalDestPoint, usedDieValue);
        // isActionInProgress will be set to false by handleMove's finally block
    };

    const handleUndoMoves = () => {
        if (!isMyTurn || moveHistory.length === 0 || isActionInProgress) return;
        setIsActionInProgress(true);

        const lastState = moveHistory[0]; // Get the state before any moves were made this turn
        setLocalGameState(lastState);
        setMoveHistory([]);
        setHasMoved(false);
        
        setGameLog((prev) => [...prev, `${playerColor} undid all moves this turn.`] );
        setIsActionInProgress(false);
    };

    const handleConfirmMovesWrapper = () => { // Now calls the actual end turn function
        handleEndTurn();
    }


    const showDoubleButton = () => {
        if (!isMyTurn || gameSession?.status !== 'in_progress' || isActionInProgress) return false;
        if (localGameState?.is_opening_move) return false;
        const gameState = localGameState;
        if (!gameState) return false;

        // Cannot double if:
        // 1. Cube value is at maximum (64)
        // 2. A double is currently being offered
        // 3. Player has already rolled this turn
        // 4. Opponent owns the cube (only cube owner or center can offer double)
        const cubeValue = gameState.doubling_cube?.value || 1;
        const cubeOwner = gameState.doubling_cube?.owner || 'center';
        
        // If opponent owns the cube, I cannot double
        if (cubeOwner === opponentColor) {
            return false;
        }
        
        // Can double if I own it or it's in the center
        return isMyTurn &&
            cubeValue < 64 &&
            !isDoubleOffered &&
            !hasRolled &&
            (cubeOwner === 'center' || cubeOwner === playerColor);
    };

    const handleOfferDouble = async () => {
        if (!isMyTurn || isActionInProgress || !canDouble || hasRolled) return;
        setIsActionInProgress(true);
        setError(null);

        try {
            // Start from 1 if no cube value exists, or use current value
            const currentValue = localGameState.doubling_cube?.value || 1;
            const newDoubleValue = currentValue * 2;
            
            const updatedGameState = {
                ...localGameState,
                isDoubleOffered: true,
                doubling_cube: {
                    value: newDoubleValue,
                    owner: playerColor, // I'm offering, so I temporarily own it
                    position: `${playerColor}_side`
                }
            };

            await GameSession.update(gameId, {
                game_state: updatedGameState,
            });

            setLocalGameState(updatedGameState);
            setGameLog(prev => [...prev, `${playerColor === 'teal' ? 'Teal' : 'Bone'} offered to double to ${newDoubleValue}.`]);

        } catch (error) {
            console.error("Error offering double:", error);
            setError(`Error offering double: ${error.message}`);
        } finally {
            setIsActionInProgress(false);
        }
    };

    const handleDoubleResponse = async (accept) => {
        if (!isDoubleOffered || isMyTurn || isActionInProgress) return;

        setIsActionInProgress(true);
        setError(null);

        try {
            const currentDoubleValue = localGameState.doubling_cube?.value || 2;
            let updatedGameState = { ...localGameState };

            if (accept) {
                // I accepted the double, so now I own the cube
                updatedGameState = {
                    ...updatedGameState,
                    isDoubleOffered: false,
                    doubling_cube: {
                        value: currentDoubleValue,
                        owner: playerColor, // I own it now because I accepted
                        position: `${playerColor}_side`
                    }
                };
                setGameLog(prev => [...prev, `${playerColor === 'teal' ? 'Teal' : 'Bone'} accepted the double. Cube value is now ${currentDoubleValue}.`]);

            } else {
                // I declined - opponent wins the match
                const newMatchState = {
                    ...(gameSession.match_state || {}),
                    player_teal_score: opponentColor === 'teal' ? gameSession.match_state.target_score : (gameSession.match_state?.player_teal_score || 0),
                    player_bone_score: opponentColor === 'bone' ? gameSession.match_state.target_score : (gameSession.match_state?.player_bone_score || 0),
                };

                await GameSession.update(gameId, {
                    status: 'completed',
                    winner_id: opponentColor === 'teal' ? gameSession.player_teal_id : gameSession.player_bone_id,
                    match_state: newMatchState
                });

                setGameLog(prev => [...prev, `${playerColor === 'teal' ? 'Teal' : 'Bone'} declined the double and resigned the match.`]);
                setShowDoubleOfferModal(false);
                setGameStatus('Match resigned due to double rejection. Finalising results...');
                setIsActionInProgress(false);
                return;
            }

            await GameSession.update(gameId, {
                game_state: updatedGameState,
            });

            setLocalGameState(updatedGameState);
            setShowDoubleOfferModal(false);

        } catch (error) {
            console.error("Error responding to double:", error);
            setError(`Error responding to double: ${error.message}`);
        } finally {
            setIsActionInProgress(false);
        }
    };


    const getTransformedPosition = () => {
        if (!localGameState || !localGameState.board) return {};
        if (playerColor === 'bone') {
            const transformed = {};
            Object.keys(localGameState.board).forEach(point => {
                const originalPoint = parseInt(point, 10);
                const newPoint = 25 - originalPoint; // Reverse point for bone player's view
                transformed[newPoint] = { ...localGameState.board[point] };
            });
            return transformed;
        }
        return localGameState.board;
    };

    const getTransformedBar = () => {
        if (!localGameState || !localGameState.bar) return { teal: 0, bone: 0 };
        if (playerColor === 'bone') {
            // For bone player, 'teal' bar is on their side (display 25), 'bone' bar is on opponent side (display 0)
            return { teal: localGameState.bar.bone, bone: localGameState.bar.teal };
        }
        return localGameState.bar;
    };

    const getTransformedBornOff = () => {
        if (!localGameState) return { teal: 0, bone: 0 };
        if (playerColor === 'bone') {
            // For bone player, born-off 'teal' is display 0, 'bone' is display 25
            return { teal: localGameState.bornOff.bone, bone: localGameState.bornOff.teal };
        }
        return localGameState.bornOff;
    };

    const getTransformedCubeOwner = (canonicalOwner) => {
        if (!canonicalOwner || canonicalOwner === 'center') return 'center';
        if (playerColor === 'bone') {
            if (canonicalOwner === 'teal') return 'bone'; // Teal is opponent for bone, so cube belongs to 'bone' from display perspective
            if (canonicalOwner === 'bone') return 'teal'; // Bone is player for bone, so cube belongs to 'teal' from display perspective
        }
        return canonicalOwner;
    };

    const formatTime = (seconds) => {
        if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
            seconds = 0;
        }
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getPlayerDisplayName = (playerId) => {
        if (!playerInfo.tealPlayer && !playerInfo.bonePlayer) return 'Unknown';

        // Find player by ID from the session and playerInfo
        const tealPlayerFromSession = gameSession?.player_teal_id === playerId ? playerInfo.tealPlayer : null;
        const bonePlayerFromSession = gameSession?.player_bone_id === playerId ? playerInfo.bonePlayer : null;

        if (tealPlayerFromSession) {
            return tealPlayerFromSession.username || 'Teal Player';
        }
        if (bonePlayerFromSession) {
            return bonePlayerFromSession.username || 'Bone Player';
        }
        return 'Unknown';
    };


    const diceForDisplay = useCallback(() => {
        const gameState = localGameState;

        // OPENING ROLL: Show both dice with their respective colors
        if (gameState?.is_opening_move && gameState.opening_rolls) {
            const displayDice = [];
            if (gameState.opening_rolls.teal > 0) {
                displayDice.push({ id: 'teal_roll', value: gameState.opening_rolls.teal, playerColor: 'teal', isUsed: false });
            }
            if (gameState.opening_rolls.bone > 0) {
                displayDice.push({ id: 'bone_roll', value: gameState.opening_rolls.bone, playerColor: 'bone', isUsed: false });
            }
            return displayDice;
        }

        // REGULAR TURN: Show dice with current player's color
        const dice = animatedDice.length > 0 ? animatedDice : localGameState?.dice;
        if (!dice || dice.length < 2 || (dice[0] === 0 && dice[1] === 0)) {
            return [];
        }

        const currentPlayer = localGameState?.turn || playerColor;
        const tempMovesRemaining = localGameState?.movesRemaining ? [...localGameState.movesRemaining] : [];

        const createDieObject = (id, value, color) => {
            let isUsed = true;
            const index = tempMovesRemaining.indexOf(value);
            if (index !== -1) {
                isUsed = false;
                tempMovesRemaining.splice(index, 1);
            }
            return { id, value, playerColor: color, isUsed };
        };

        if (dice[0] === dice[1]) {
            return [
                createDieObject(1, dice[0], currentPlayer),
                createDieObject(2, dice[0], currentPlayer),
                createDieObject(3, dice[0], currentPlayer),
                createDieObject(4, dice[0], currentPlayer)
            ];
        } else {
            return [
                createDieObject(1, dice[0], currentPlayer),
                createDieObject(2, dice[1], currentPlayer)
            ];
        }
    }, [animatedDice, localGameState, playerColor]);


    const showRollButton = () => {
        // Don't show if we just ended turn (prevents flash)
        if (justEndedTurn) {
            // console.log('[showRollButton] Hidden - just ended turn');
            return false;
        }
        
        if (!gameSession || gameSession.status !== 'in_progress') {
            // console.log('[showRollButton] Hidden - game not in progress');
            return false;
        }
        
        if (!isMyTurn) {
            // console.log('[showRollButton] Hidden - not my turn');
            return false;
        }
        
        if (isActionInProgress) {
            // console.log('[showRollButton] Hidden - action in progress');
            return false;
        }
        
        if (!localGameState) {
            // console.log('[showRollButton] Hidden - no local game state');
            return false;
        }

        // Show roll button if dice haven't been rolled yet (both dice are 0)
        const diceNotRolled = !localGameState.dice || (localGameState.dice[0] === 0 && localGameState.dice[1] === 0);
        
        // Don't show during opening move (opening roll is automatic)
        const notOpeningMove = !localGameState.is_opening_move;
        
        // Don't show if there are moves remaining (player is mid-turn)
        const noMovesRemaining = !localGameState.movesRemaining || localGameState.movesRemaining.length === 0;
        
        const shouldShow = diceNotRolled && notOpeningMove && noMovesRemaining;
        // console.log('[showRollButton]', {
        //     shouldShow,
        //     diceNotRolled,
        //     notOpeningMove,
        //     noMovesRemaining,
        //     dice: localGameState.dice,
        //     movesRemaining: localGameState.movesRemaining,
        //     isMyTurn,
        //     playerColor,
        //     currentTurn: gameSession.current_player_turn
        // });
        
        return shouldShow;
    };

    const showEndTurnButton = () => {
        // Don't show if we just ended turn (prevents flash)
        if (justEndedTurn) {
            return false;
        }
        
        if (!isMyTurn || !localGameState || gameSession?.status !== 'in_progress') {
            return false;
        }
        
        if (isActionInProgress) {
            return false;
        }

        const hasRolledDice = localGameState.dice && 
                             localGameState.dice[0] > 0 && 
                             localGameState.dice[1] > 0;
        const noMovesLeft = !localGameState.movesRemaining || localGameState.movesRemaining.length === 0;
        
        return hasRolledDice && noMovesLeft && pendingMoves.length === 0;
    };

    const showUndoButton = () => {
        if (!isMyTurn || gameSession?.status !== 'in_progress' || isActionInProgress) return false;
        
        return hasMoved && moveHistory.length > 0;
    };


    if (loading || userLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
                <div className="text-center">
                    <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: '#5a3217' }} />
                    <p className="text-xl font-semibold" style={{ color: '#5a3217' }}>Loading game...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
                <div className="text-center">
                    <p className="text-red-600 text-xl mb-4">{error}</p>
                    <Button onClick={() => navigate(createPageUrl('Home'))}>
                        Return to Lobby
                    </Button>
                </div>
            </div>
        );
    }

    // Show winner modal when match is completed
    if (showWinnerModal) {
        return (
             <div className="min-h-screen" style={{ backgroundColor: '#e5e4cd' }}>
                <WinnerModal
                    isOpen={true}
                    onClose={() => {
                        setShowWinnerModal(false);
                        navigate(createPageUrl('Home'));
                    }}
                    winnerId={gameSession?.winner_id}
                    gameSession={gameSession}
                    playerInfo={playerInfo}
                    results={winnerData} // Pass the results to the modal
                />
            </div>
        );
    }
    
    // Show ready modal for waiting_for_start
    if (gameSession?.status === 'waiting_for_start') {
        return (
            <div className="min-h-screen" style={{ backgroundColor: '#e5e4cd' }}>
                <MatchChallengeModal
                    gameSession={gameSession}
                    playerInfo={playerInfo}
                    user={user}
                    onCancel={handleCancelMatch}
                    isActionInProgress={isActionInProgress}
                />
            </div>
        );
    }

    const matchState = gameSession.match_state || {};

    const currentPlayerColor = playerColor;
    const opponentPlayerColor = playerColor === 'teal' ? 'bone' : 'teal';

    const player = playerInfo[currentPlayerColor + 'Player'] || null;
    const opponent = playerInfo[opponentPlayerColor + 'Player'] || null;

    const showVideo = matchState?.use_video_chat && matchState?.video_chat_url;

    const diceForDisplayForBoard = diceForDisplay(); // This is for board display, might differ from control buttons
    const hasPlayerRolledOpeningDie = localGameState?.opening_rolls && localGameState.opening_rolls[playerColor] !== undefined;


    const handleShareScreenshot = () => {
        console.log("Share Screenshot button clicked. Implement actual screenshot capture and sharing here.");
        alert("Screenshot sharing feature is under development!");
    };


    return (
        <div className="min-h-screen relative overflow-hidden p-2 md:p-4" style={{ backgroundColor: '#e5e4cd' }}>
            <style>{`
                .portrait-message {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background-color: #e5e4cd;
                    z-index: 9999;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    padding: 2rem;
                    color: #5a3217;
                }

                .landscape-content-wrapper {
                    display: block;
                }

                @media screen and (max-width: 767px) and (orientation: portrait) {
                    .portrait-message {
                        display: flex;
                    }
                    .landscape-content-wrapper {
                        display: none;
                    }
                }
            `}</style>

            <div className="portrait-message">
                <Smartphone className="w-16 h-16 mb-6 text-[#f26222]" />
                <h2 className="text-2xl font-bold mb-2">Rotate Your Device</h2>
                <p className="text-lg">This game is best played in landscape mode.</p>
            </div>

            <div className="landscape-content-wrapper">
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="min-h-screen p-2 md:p-4 relative" style={{ backgroundColor: '#e5e4cd' }}>
                        <style>{`
                            .game-btn-roll {
                                background-color: #f26222 !important;
                                color: white !important;
                                transition: background-color 0.2s ease-in-out;
                            }
                            .game-btn-roll:hover:not(:disabled) {
                                background-color: #d9581e !important;
                            }

                            .game-btn-action {
                                background-color: #007e81 !important;
                                color: white !important;
                                transition: background-color 0.2s ease-in-out;
                            }
                            .game-btn-action:hover:not(:disabled) {
                                background-color: #006a6c !important;
                            }

                            .game-btn-undo {
                                background-color: #e5e4cd !important;
                                color: #5a3217 !important;
                                transition: background-color 0.2s ease-in-out;
                                border: 1px solid #c1c0ae !important;
                            }
                            .game-btn-undo:hover:not(:disabled) {
                                background-color: #d1d0b9 !important;
                            }

                            /* General disabled state for all custom game buttons */
                            .game-btn-roll:disabled, .game-btn-action:disabled, .btn-undo:disabled {
                                opacity: 0.6;
                                cursor: not-allowed;
                            }
                        `}</style>
                        <div className="max-w-[1400px] mx-auto space-y-4 p-2 md:p-6" data-game-board>
                            <GameConnectionStatus /> 
                            
                            <Link to={createPageUrl("Home")} className="inline-flex items-center gap-2 hover:opacity-70 transition-colors" style={{ color: '#5a3217' }}>
                                <ArrowLeft className="w-4 h-4" /> <span>Back to Lobby</span>
                            </Link>

                            <div className="text-center">
                                {gameSession.status !== 'completed' ? (
                                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl md:text-2xl font-bold" style={{ color: '#5a3217' }}>
                                                {player?.username || 'Player'}
                                            </span>
                                            {player?.profile_picture_url ? (
                                                <img
                                                    src={player.profile_picture_url}
                                                    alt={player.username}
                                                    className="w-16 h-16 md:w-24 md:h-24 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-[#5a3217] flex items-center justify-center">
                                                    <User className="w-8 h-8 md:w-12 md:h-12 text-bone-color" />
                                                </div>
                                            )}
                                        </div>

                                        {matchState.target_score > 0 && gameSession.status === 'in_progress' ? (
                                            <span className="text-2xl md:text-3xl font-bold" style={{ color: '#f26222' }}>
                                                {matchState.player_teal_score || 0} - {matchState.player_bone_score || 0}
                                                <span className="text-lg md:text-xl">/{matchState.target_score}</span>
                                            </span>
                                        ) : (
                                            <span className="text-2xl md:text-3xl font-bold" style={{ color: '#f26222' }}>VS</span>
                                        )}


                                        <div className="flex items-center gap-3">
                                            {opponent?.profile_picture_url ? (
                                                <img
                                                    src={opponent.profile_picture_url}
                                                    alt={opponent.username}
                                                    className="w-16 h-16 md:w-24 md:h-24 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-[#5a3217] flex items-center justify-center">
                                                    <User className="w-8 h-8 md:w-12 md:h-12 text-bone-color" />
                                                </div>
                                            )}
                                            <span className="text-xl md:text-2xl font-bold" style={{ color: '#5a3217' }}>
                                                {opponent?.username || 'Opponent'}
                                            </span>
                                        </div>

                                        {gameSession.bones_stake > 0 && (
                                            <div className="ml-4 md:ml-8 flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg" style={{ backgroundColor: '#f26222' }}>
                                                <span className="text-xl md:text-2xl">🦴</span>
                                                <span className="font-bold text-lg md:text-xl text-white">{gameSession.bones_stake}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#5a3217' }}>
                                        Match Complete!
                                    </h1>
                                )}
                            </div>

                            {gameSession.status === 'in_progress' && (
                                    <>
                                        <div className="flex flex-col lg:flex-row items-start justify-center gap-4 w-full">
                                            <div className="relative w-full lg:flex-1 flex flex-col items-center">

                                                {/* Game Controls - Buttons for rolling and actions */}
                                                <div className="game-controls flex items-center justify-center gap-4 my-4">
                                                    {/* Regular Roll Button */}
                                                    {showRollButton() && (
                                                        <Button
                                                            onClick={handleRollDice}
                                                            disabled={isActionInProgress || isRolling}
                                                            className="game-btn-roll"
                                                        >
                                                            Roll Dice
                                                        </Button>
                                                    )}
                                                    {/* Removed external Offer Double Button, it will now be handled by BackgammonBoard */}
                                                </div>

                                                {localGameState && localGameState.board ? (
                                                    <BackgammonBoard
                                                        position={getTransformedPosition()}
                                                        bar={getTransformedBar()}
                                                        bornOff={getTransformedBornOff()}
                                                        isPlayerTurn={isMyTurn}
                                                        playerColor={playerColor}
                                                        doublingCube={{
                                                            value: localGameState.doubling_cube?.value || 1,
                                                            owner: getTransformedCubeOwner(localGameState.doubling_cube?.owner),
                                                            position: localGameState.doubling_cube?.position || 'center'
                                                        }}
                                                        showControls={isMyTurn}
                                                        showDoubleButton={showDoubleButton} // Pass the function reference
                                                        onRollDice={handleRollDice} // Make sure this line exists
                                                        onOfferDouble={handleOfferDouble}
                                                        onTakeDouble={() => handleDoubleResponse(true)}
                                                        onPassDouble={() => handleDoubleResponse(false)}
                                                        isDoubleBeingOffered={isDoubleOffered}
                                                        rollDisabled={isActionInProgress || isRolling || hasRolled} // Still used for internal board logic
                                                        diceDisplay={diceForDisplayForBoard} // Use the board-specific dice display
                                                        showUndo={showUndoButton()}
                                                        undoReady={showUndoButton() && !isActionInProgress}
                                                        showEndTurn={showEndTurnButton()}
                                                        endTurnReady={showEndTurnButton() && !isActionInProgress}
                                                        onConfirmTurn={handleConfirmMovesWrapper}
                                                        onUndoMoves={handleUndoMoves}
                                                        onCheckerClick={handleCheckerClick}
                                                        onPointClick={handlePointClick}
                                                        onBarClick={() => handleBoardClick(playerColor === 'teal' ? 25 : 0)}
                                                        isPlayerReceivingDouble={!isMyTurn && isDoubleOffered}
                                                        doubledCubeValue={localGameState?.doubling_cube?.value}
                                                        matchState={matchState}
                                                        timeLeft={timeLeft}
                                                        delaySecondsRemaining={delaySecondsRemaining}
                                                        isFirstMove={localGameState?.is_opening_move}
                                                        onInitialRoll={handlePlayerReady}
                                                        isActionInProgress={isActionInProgress}
                                                        currentPlayerTurn={gameSession.current_player_turn}
                                                        formatTime={formatTime}
                                                        isWaitingForOpponent={gameSession.status === 'waiting_for_start' && !gameSession.match_state.player_bone_ready}
                                                        isInitialTurnForDisplay={isInitialTurnForDisplay}
                                                        boardLogoUrl={boardLogoUrl}
                                                        gameSession={gameSession}
                                                    />
                                                ) : (
                                                    <div className="w-full aspect-[4/3] flex items-center justify-center bg-gray-800/20 rounded-lg">
                                                        <div className="text-center">
                                                            <RefreshCw className="w-8 h-8 text-white animate-spin mx-auto" />
                                                            <p className="mt-2 text-white">Loading board...</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex gap-2 mt-4">
                                                    <Button
                                                        onClick={handleResign}
                                                        className="game-btn-action"
                                                        disabled={isActionInProgress || gameSession.status !== 'in_progress'}
                                                    >
                                                        <Flag className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Resign Match
                                                    </Button>
                                                    <Button
                                                        onClick={() => setShowSavePositionModal(true)}
                                                        className="game-btn-action"
                                                        disabled={isActionInProgress}
                                                    >
                                                        <Share2 className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Save Position
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="w-full lg:w-1/4 flex-shrink-0">
                                                {showVideo ? (
                                                    <VideoCall
                                                        roomUrl={matchState.video_chat_url}
                                                        username={user?.username || user?.full_name || 'Player'}
                                                    />
                                                ) : (
                                                    <>
                                                        <div className="hidden lg:block">
                                                            <GameChatBox
                                                                gameId={gameId}
                                                                playerInfo={playerInfo}
                                                            />
                                                        </div>
                                                        <div className="lg:hidden mt-4 flex justify-center">
                                                            <FloatingChatIcon
                                                                gameId={gameId}
                                                                playerInfo={playerInfo}
                                                                onOpenChat={() => setShowChatModal(true)}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <Card className="tool-card-bg border-0 elegant-shadow w-full mt-4">
                                            <CardHeader>
                                                <CardTitle className="main-text text-lg">Game Log</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="h-32 overflow-y-auto space-y-1">
                                                    {gameLog.map((logEntry, index) => (
                                                        <div key={index} className="text-sm main-text opacity-80 p-2 bg-white/30 rounded">
                                                            {logEntry}
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </>
                                )
                            }
                        </div>

                        {showChatModal && gameSession?.status === 'in_progress' && (
                            <ChatModal
                                isOpen={showChatModal}
                                onClose={() => setShowChatModal(false)}
                                gameId={gameId}
                                playerInfo={playerInfo}
                            />
                        )}

                        {showSavePositionModal && (
                            <SavePositionModal
                                isOpen={showSavePositionModal}
                                onClose={() => setShowSavePositionModal(false)}
                                gameSession={gameSession}
                                playerInfo={playerInfo}
                                user={user}
                                playerColor={playerColor}
                            />
                        )}

                        {/* Show Double Offer Modal (to the player receiving the offer) */}
                        {showDoubleOfferModal && (
                            <DoubleOfferModal
                                isOpen={showDoubleOfferModal}
                                onTake={() => handleDoubleResponse(true)}
                                onPass={() => handleDoubleResponse(false)}
                                value={localGameState?.doubling_cube?.value * 2} // Value of the double being offered
                            />
                        )}

                    </div>
                </DragDropContext>
            </div>
        </div>
    );
}
