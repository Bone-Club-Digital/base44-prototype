
import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff } from 'lucide-react';

export default function VideoCall({ roomUrl, playerTealName, playerBoneName, currentPlayerColor }) {
    const callFrameRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [participants, setParticipants] = useState({});
    const [hasRemoteParticipant, setHasRemoteParticipant] = useState(false);

    useEffect(() => {
        if (!roomUrl || !window.DailyIframe) {
            console.error('Video room URL or Daily.co not available');
            return;
        }

        const initializeCall = async () => {
            try {
                const callFrame = window.DailyIframe.createCallObject();
                callFrameRef.current = callFrame;

                const updateVideoStreams = () => {
                    const allParticipants = callFrame.participants();
                    setParticipants(allParticipants);

                    // Connect local video (your own video - top window)
                    const local = allParticipants.local;
                    if (local && local.videoTrack && localVideoRef.current) {
                        const localStream = new MediaStream([local.videoTrack]);
                        localVideoRef.current.srcObject = localStream;
                        localVideoRef.current.play().catch(e => console.log('Local video play failed:', e));
                    }

                    // Connect remote video (opponent's video - bottom window)
                    const remoteParticipants = Object.values(allParticipants).filter(p => !p.local);
                    if (remoteParticipants.length > 0) {
                        const remoteParticipant = remoteParticipants[0];
                        setHasRemoteParticipant(true);
                        
                        if (remoteParticipant.videoTrack && remoteVideoRef.current) {
                            const remoteStream = new MediaStream([remoteParticipant.videoTrack]);
                            remoteVideoRef.current.srcObject = remoteStream;
                            remoteVideoRef.current.play().catch(e => console.log('Remote video play failed:', e));
                        }
                        
                        // Also connect audio if available
                        if (remoteParticipant.audioTrack) {
                            // Audio will be handled automatically by Daily.co
                            console.log('Remote audio track available');
                        }
                    } else {
                        setHasRemoteParticipant(false);
                    }
                };

                // Event listeners
                callFrame.on('joined-meeting', (event) => {
                    console.log('Joined meeting', event);
                    setTimeout(updateVideoStreams, 500); // Small delay to ensure tracks are ready
                });

                callFrame.on('participant-joined', (event) => {
                    console.log('Participant joined', event);
                    setTimeout(updateVideoStreams, 500);
                });

                callFrame.on('participant-updated', (event) => {
                    console.log('Participant updated', event);
                    updateVideoStreams();
                });

                callFrame.on('participant-left', (event) => {
                    console.log('Participant left', event);
                    updateVideoStreams();
                });

                callFrame.on('track-started', (event) => {
                    console.log('Track started', event);
                    updateVideoStreams();
                });

                callFrame.on('camera-error', (event) => {
                    console.error('Camera error:', event);
                });

                // Join the call with video and audio enabled by default
                await callFrame.join({ 
                    url: roomUrl,
                    startVideoOff: false,
                    startAudioOff: false
                });

            } catch (error) {
                console.error('Error initializing video call:', error);
            }
        };

        initializeCall();

        return () => {
            if (callFrameRef.current) {
                callFrameRef.current.destroy();
            }
        };
    }, [roomUrl]);

    const toggleVideo = () => {
        if (callFrameRef.current) {
            const newState = !isVideoEnabled;
            callFrameRef.current.setLocalVideo(newState);
            setIsVideoEnabled(newState);
        }
    };

    const toggleAudio = () => {
        if (callFrameRef.current) {
            const newState = !isAudioEnabled;
            callFrameRef.current.setLocalAudio(newState);
            setIsAudioEnabled(newState);
        }
    };

    return (
        <div className="w-full flex flex-col gap-2 md:gap-4">
            {/* Your Video (Local - Top) */}
            <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video relative">
                <div className="absolute top-1 left-1 md:top-2 md:left-2 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 md:px-2 md:py-1 rounded z-10">
                    You
                </div>
                <video 
                    ref={localVideoRef}
                    className="w-full h-full object-cover"
                    autoPlay 
                    muted
                    playsInline
                    style={{ transform: 'scaleX(-1)' }} // Only mirror your own video
                />
                {!isVideoEnabled && (
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                        <VideoOff className="w-4 h-4 md:w-8 md:h-8 text-gray-400" />
                    </div>
                )}
            </div>

            {/* Opponent's Video (Remote - Bottom) */}
            <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video relative">
                <div className="absolute top-1 left-1 md:top-2 md:left-2 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 md:px-2 md:py-1 rounded z-10">
                    Opponent
                </div>
                <video 
                    ref={remoteVideoRef}
                    className="w-full h-full object-cover"
                    autoPlay 
                    playsInline
                    // No mirroring for opponent's video
                />
                {!hasRemoteParticipant && (
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                        <div className="text-center text-gray-400">
                            <VideoOff className="w-4 h-4 md:w-8 md:h-8 mx-auto mb-1 md:mb-2" />
                            <p className="text-xs">Waiting for opponent...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls - Only affect YOUR video/audio */}
            <div className="flex gap-1 md:gap-2 justify-center">
                <button
                    onClick={toggleVideo}
                    className={`p-1 md:p-2 rounded-full ${isVideoEnabled ? 'bg-blue-600' : 'bg-red-600'} text-white hover:opacity-80 transition-opacity`}
                    title={`${isVideoEnabled ? 'Turn off' : 'Turn on'} your camera`}
                >
                    {isVideoEnabled ? <Video className="w-3 h-3 md:w-4 md:h-4" /> : <VideoOff className="w-3 h-3 md:w-4 md:h-4" />}
                </button>
                <button
                    onClick={toggleAudio}
                    className={`p-1 md:p-2 rounded-full ${isAudioEnabled ? 'bg-blue-600' : 'bg-red-600'} text-white hover:opacity-80 transition-opacity`}
                    title={`${isAudioEnabled ? 'Mute' : 'Unmute'} your microphone`}
                >
                    {isAudioEnabled ? <Mic className="w-3 h-3 md:w-4 md:h-4" /> : <MicOff className="w-3 h-3 md:w-4 md:h-4" />}
                </button>
            </div>
        </div>
    );
}
