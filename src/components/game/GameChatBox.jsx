
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GameMessage } from '@/entities/GameMessage';
import { useUser } from '../auth/UserProvider';

export default function GameChatBox({ gameId, playerInfo }) {
    const { user } = useUser();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef(null);
    const lastMessageFetch = useRef(0);
    const previousMessageCount = useRef(0);

    const scrollToBottom = () => {
        // Only scroll on mobile devices (screen width < 768px)
        if (window.innerWidth < 768) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Only scroll when new messages are added, not on every refresh
    useEffect(() => {
        if (messages.length > previousMessageCount.current) {
            scrollToBottom();
        }
        previousMessageCount.current = messages.length;
    }, [messages]);

    // Fetch messages function wrapped in useCallback
    const fetchMessages = useCallback(async () => {
        if (!gameId) return;
        
        const now = Date.now();
        if (now - lastMessageFetch.current < 2000) return; // Throttle to every 2 seconds
        lastMessageFetch.current = now;

        try {
            const gameMessages = await GameMessage.filter({ game_session_id: gameId });
            const sortedMessages = gameMessages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
            setMessages(sortedMessages);
        } catch (error) {
            console.error('Error fetching chat messages:', error);
        }
    }, [gameId]); // Dependency for useCallback

    // Initial fetch and polling
    useEffect(() => {
        if (!gameId) return;

        fetchMessages();
        const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds

        return () => clearInterval(interval);
    }, [gameId, fetchMessages]); // Updated dependency array

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || isSending) return;

        setIsSending(true);
        try {
            await GameMessage.create({
                game_session_id: gameId,
                sender_id: user.id,
                sender_username: user.username || user.full_name || 'Player',
                message: newMessage.trim(),
                message_type: 'chat'
            });

            setNewMessage('');
            // Fetch messages immediately after sending
            // Using a timeout to ensure the message is processed by the backend
            // before attempting to fetch it again, reducing race conditions.
            setTimeout(fetchMessages, 500); 
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const getPlayerColor = (senderId) => {
        if (!playerInfo.tealPlayer || !playerInfo.bonePlayer) return 'gray';
        if (senderId === playerInfo.tealPlayer.user_id) return 'teal';
        if (senderId === playerInfo.bonePlayer.user_id) return 'bone';
        return 'gray';
    };

    return (
        <div className="w-full flex flex-col h-64 md:h-80 bg-white rounded-lg border shadow-sm">
            {/* Chat Header */}
            <div 
                className="flex items-center gap-2 px-3 py-2 border-b rounded-t-lg"
                style={{ backgroundColor: '#007e81', color: 'white' }}
            >
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Game Chat</span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm mt-4">
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const playerColor = getPlayerColor(msg.sender_id);
                        const isCurrentUser = msg.sender_id === user?.id;
                        
                        return (
                            <div 
                                key={index} 
                                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                            >
                                <div 
                                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                        isCurrentUser 
                                            ? 'bg-blue-500 text-white' 
                                            : playerColor === 'teal' 
                                                ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                                : playerColor === 'bone'
                                                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                                    : 'bg-gray-100 text-gray-800 border border-gray-200'
                                    }`}
                                >
                                    <div className="text-xs opacity-75 mb-1">
                                        {msg.sender_username}
                                    </div>
                                    <div className="text-sm">
                                        {msg.message}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-2 border-t">
                <div className="flex gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 text-sm"
                        maxLength={500}
                        disabled={isSending}
                    />
                    <Button 
                        type="submit" 
                        size="sm"
                        disabled={!newMessage.trim() || isSending}
                        style={{ backgroundColor: '#007e81', color: 'white' }}
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </form>
        </div>
    );
}
