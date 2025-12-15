import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameMessage } from '@/entities/GameMessage';
import { useUser } from '../auth/UserProvider';

export default function FloatingChatIcon({ gameId, onOpenChat, playerInfo }) {
    const { user } = useUser();
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastOpenTime, setLastOpenTime] = useState(() => {
        // Get last open time from localStorage or default to now
        const stored = localStorage.getItem(`chat_last_open_${gameId}`);
        return stored ? parseInt(stored) : Date.now();
    });

    // Check for unread messages
    useEffect(() => {
        if (!gameId || !user || !playerInfo.tealPlayer || !playerInfo.bonePlayer) return;

        const checkUnreadMessages = async () => {
            try {
                const messages = await GameMessage.filter({ game_session_id: gameId });
                
                // Count messages from opponent that arrived after last open time
                const opponentId = user.id === playerInfo.tealPlayer.user_id 
                    ? playerInfo.bonePlayer.user_id 
                    : playerInfo.tealPlayer.user_id;
                
                const unreadFromOpponent = messages.filter(msg => 
                    msg.sender_id === opponentId && 
                    new Date(msg.created_date).getTime() > lastOpenTime
                );
                
                setUnreadCount(unreadFromOpponent.length);
            } catch (error) {
                console.error('Error checking unread messages:', error);
            }
        };

        checkUnreadMessages();
        
        // Check every 5 seconds for new messages
        const interval = setInterval(checkUnreadMessages, 5000);
        return () => clearInterval(interval);
    }, [gameId, user, playerInfo, lastOpenTime]);

    const handleOpenChat = () => {
        // Update last open time
        const now = Date.now();
        setLastOpenTime(now);
        localStorage.setItem(`chat_last_open_${gameId}`, now.toString());
        setUnreadCount(0);
        onOpenChat();
    };

    return (
        <div className="relative">
            <Button
                onClick={handleOpenChat}
                className="relative h-14 w-14 rounded-full shadow-lg"
                style={{ backgroundColor: '#007e81', color: 'white' }}
            >
                <MessageSquare className="h-7 w-7" />
                
                {/* Unread indicator */}
                {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg border-2 border-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                )}
            </Button>
        </div>
    );
}