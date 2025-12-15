
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { useNavigate } from 'react-router-dom';
import { Message } from '@/entities/Message';
import { ClubMember } from '@/entities/ClubMember';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Send, Reply, Check, Trophy, Gamepad2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ReactMarkdown from 'react-markdown';
import LeagueInvitationCard from '../components/leagues/LeagueInvitationCard';
import MessageComposerModal from '../components/messages/MessageComposerModal';
import TournamentInvitationCard from '../components/tournaments/TournamentInvitationCard';
import ClubInvitationNotifications from '../components/notifications/ClubInvitationNotifications'; // NEW
import FriendRequestNotifications from '../components/notifications/FriendRequestNotifications'; // NEW
import ScheduledMatchInvitationNotifications from '../components/notifications/ScheduledMatchInvitationNotifications'; // NEW
import LeagueProposalNotificationCard from '../components/leagues/LeagueProposalNotificationCard'; // NEW
import { getLeagueProposalsForUser } from '@/functions/getLeagueProposalsForUser'; // NEW
import { ScheduledMatch } from '@/entities/ScheduledMatch'; // NEW

const getConversationId = (msg) => {
    // A conversation is uniquely identified by its thread_id.
    // If a message doesn't have a thread_id, it's the start of a new thread,
    // so its own ID acts as the thread_id for that conversation.
    return msg.thread_id || msg.id;
};

export default function MessagesPage() {
    const { user, loading: userLoading, refetchUnreadMessages } = useUser();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isComposerOpen, setComposerOpen] = useState(false);
    const [replyToMessage, setReplyToMessage] = useState(null); // Renamed from replyTo

    const [activeTab, setActiveTab] = useState('direct');
    // directMessages and clubMessages will be objects where keys are conversation IDs
    // and values are conversation objects (with messages, unreadCount, etc.)
    const [directMessages, setDirectMessages] = useState({});
    const [clubMessages, setClubMessages] = useState({});
    const [generalNotifications, setGeneralNotifications] = useState([]);

    // States for actionable notifications
    const [pendingFriendRequests, setPendingFriendRequests] = useState([]);
    const [pendingClubInvites, setPendingClubInvites] = useState([]);
    const [pendingScheduledMatchInvites, setPendingScheduledMatchInvites] = useState([]);
    const [pendingLeagueInvites, setPendingLeagueInvites] = useState([]);
    const [pendingTournamentInvites, setPendingTournamentInvites] = useState([]);
    const [leagueProposals, setLeagueProposals] = useState([]);

    const fetchAndCategorizeMessages = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        
        try {
            // Fetch all messages where current user is recipient or sender
            const [receivedMessages, sentMessages] = await Promise.all([
                Message.filter({ recipient_id: user.id }, '-created_date'),
                Message.filter({ sender_id: user.id }, '-created_date')
            ]);

            // Combine and unique messages (a message shouldn't be both received and sent by the same user, but ensures no duplicates if thread logic has overlaps)
            const allMessages = [...receivedMessages, ...sentMessages.filter(sm => !receivedMessages.some(rm => rm.id === sm.id))];

            // Fetch club memberships to get club names for display
            const clubs = await ClubMember.filter({ user_id: user.id, status: 'active' });
            const clubMap = new Map(clubs.map(c => [c.club_id, c.club_name]));

            // Initialize categorization objects
            const direct = {};
            const club = {};
            
            // Filter all notifications first
            const allNotifications = allMessages.filter(m => m.type === 'notification');

            // Categorize actionable notifications (unread and where current user is the recipient)
            const friendReqs = allNotifications.filter(m => m.related_entity_type === 'FriendRequest' && m.status === 'unread' && m.recipient_id === user.id);
            const clubInvites = allNotifications.filter(m => m.related_entity_type === 'ClubMember' && m.status === 'unread' && m.recipient_id === user.id);
            const leagueInvites = allNotifications.filter(m => m.related_entity_type === 'LeagueParticipant' && m.status === 'unread' && m.recipient_id === user.id);
            const tournamentInvites = allNotifications.filter(m => m.related_entity_type === 'TournamentParticipant' && m.status === 'unread' && m.recipient_id === user.id);
            const scheduledMatchInvites = allNotifications.filter(m => m.related_entity_type === 'ScheduledMatch' && m.subject?.includes('invitation') && m.status === 'unread' && m.recipient_id === user.id);
            
            const actionableIds = new Set([
                ...friendReqs.map(m => m.id),
                ...clubInvites.map(m => m.id),
                ...leagueInvites.map(m => m.id),
                ...tournamentInvites.map(m => m.id),
                ...scheduledMatchInvites.map(m => m.id),
            ]);
            
            // General notifications are all 'notification' types that are not one of the specific actionable types
            const generalNotifs = allNotifications.filter(m => !actionableIds.has(m.id));

            // Process user_message types for direct and club conversations
            const userMessages = allMessages.filter(m => m.type === 'user_message');
            userMessages.forEach(msg => {
                const convId = getConversationId(msg); // This will be the thread identifier
                const targetDict = msg.club_id ? club : direct;

                if (!targetDict[convId]) {
                    targetDict[convId] = {
                        id: convId, // The thread identifier
                        // Determine participants for direct messages (the 'other' person or club info)
                        participants: msg.club_id 
                            ? [{ id: msg.club_id, name: clubMap.get(msg.club_id) || 'Unknown Club' }] 
                            : [{ 
                                id: msg.sender_id === user.id ? msg.recipient_id : msg.sender_id,
                                name: msg.sender_id === user.id ? msg.recipient_username : msg.sender_username
                            }],
                        subject: msg.subject,
                        messages: [],
                        unreadCount: 0,
                        lastMessageDate: new Date(0)
                    };
                }
                targetDict[convId].messages.push(msg);
                // Only count as unread if the user is the recipient and status is unread
                if (msg.recipient_id === user.id && msg.status === 'unread') {
                    targetDict[convId].unreadCount++;
                }
                if (new Date(msg.created_date).getTime() > targetDict[convId].lastMessageDate.getTime()) {
                    targetDict[convId].lastMessageDate = new Date(msg.created_date);
                }
            });
            
            // Sort messages within each conversation by date
            Object.values(direct).forEach(conv => conv.messages.sort((a,b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime()));
            Object.values(club).forEach(conv => conv.messages.sort((a,b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime()));

            setDirectMessages(direct);
            setClubMessages(club);

            // Set actionable notification states
            setPendingFriendRequests(friendReqs);
            setPendingClubInvites(clubInvites);
            setPendingLeagueInvites(leagueInvites);
            setPendingTournamentInvites(tournamentInvites);

            if (scheduledMatchInvites.length > 0) {
                const matchIds = scheduledMatchInvites.map(m => m.related_entity_id).filter(Boolean);
                const scheduledMatches = await ScheduledMatch.filter({ id: { '$in': matchIds } });
                const matchesMap = new Map(scheduledMatches.map(match => [match.id, match]));
                const enrichedInvites = scheduledMatchInvites.map(message => ({
                    ...message,
                    scheduledMatch: matchesMap.get(message.related_entity_id) || null
                })).filter(invite => invite.scheduledMatch); // Only keep if related match found
                setPendingScheduledMatchInvites(enrichedInvites);
            } else {
                setPendingScheduledMatchInvites([]);
            }

            try {
                const { data } = await getLeagueProposalsForUser();
                setLeagueProposals((data || []).filter(p => p.status === 'pending'));
            } catch (e) {
                console.warn('Could not fetch league proposals for messages page', e);
                setLeagueProposals([]);
            }
            
            const sortedGeneralNotifications = generalNotifs.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
            setGeneralNotifications(sortedGeneralNotifications);

        } catch (err) {
            console.error("Error fetching messages:", err);
            setError("Failed to load messages. Please try refreshing.");
        } finally {
            setLoading(false);
            refetchUnreadMessages(); // Always refresh the global unread count
        }
    }, [user, refetchUnreadMessages]);

    useEffect(() => {
        if (!userLoading && user) { // Ensure user is loaded and exists
            fetchAndCategorizeMessages();
        } else if (!userLoading && !user) {
            navigate('/');
        }
    }, [user, userLoading, navigate, fetchAndCategorizeMessages]);

    const handleMessageSent = () => {
        setComposerOpen(false);
        setReplyToMessage(null); // Reset replyToMessage after sending
        fetchAndCategorizeMessages(); // Re-fetch all messages after sending
    };

    const markConversationAsRead = useCallback(async (conversationId) => {
        // Optimistically update UI
        setDirectMessages(prev => {
            if (prev[conversationId]) {
                const updatedConv = { ...prev[conversationId] };
                updatedConv.messages = updatedConv.messages.map(msg => 
                    (msg.recipient_id === user.id && msg.status === 'unread') ? { ...msg, status: 'read' } : msg
                );
                updatedConv.unreadCount = 0;
                return { ...prev, [conversationId]: updatedConv };
            }
            return prev;
        });
        setClubMessages(prev => {
            if (prev[conversationId]) {
                const updatedConv = { ...prev[conversationId] };
                updatedConv.messages = updatedConv.messages.map(msg => 
                    (msg.recipient_id === user.id && msg.status === 'unread') ? { ...msg, status: 'read' } : msg
                );
                updatedConv.unreadCount = 0;
                return { ...prev, [conversationId]: updatedConv };
            }
            return prev;
        });

        // Identify all unread messages in this conversation for the current user
        const allMessagesInConv = [
            ...(directMessages[conversationId]?.messages || []), 
            ...(clubMessages[conversationId]?.messages || [])
        ];
        const unreadMessagesToMark = allMessagesInConv.filter(msg => msg.recipient_id === user.id && msg.status === 'unread');

        if (unreadMessagesToMark.length > 0) {
            try {
                const updatePromises = unreadMessagesToMark.map(msg => Message.update(msg.id, { status: 'read' }));
                await Promise.all(updatePromises);
                refetchUnreadMessages(); // Update overall unread count in UserProvider
            } catch (error) {
                console.error("Failed to mark conversation as read:", error);
            }
        }
    }, [user, directMessages, clubMessages, refetchUnreadMessages]); // Dependencies for useCallback


    // Unread counts for tabs
    const directUnreadCount = useMemo(() => Object.values(directMessages).reduce((sum, conv) => sum + conv.unreadCount, 0), [directMessages]);
    const clubUnreadCount = useMemo(() => Object.values(clubMessages).reduce((sum, conv) => sum + conv.unreadCount, 0), [clubMessages]);
    const notificationsUnreadCount = useMemo(() => {
        return generalNotifications.filter(n => n.status === 'unread' && n.recipient_id === user?.id).length + // Only count unread received general notifications
               pendingFriendRequests.length +
               pendingClubInvites.length +
               pendingScheduledMatchInvites.length +
               pendingLeagueInvites.length +
               pendingTournamentInvites.length +
               leagueProposals.length; // League proposals are also "pending"
    }, [generalNotifications, pendingFriendRequests, pendingClubInvites, pendingScheduledMatchInvites, pendingLeagueInvites, pendingTournamentInvites, leagueProposals, user]);

    const ConversationThread = ({ conversation }) => {
        const uniqueMessagesForDisplay = useMemo(() => {
            if (!conversation?.messages) return [];
            const uniqueMessages = [];
            const seenBroadcasts = new Set();
            
            for (const msg of conversation.messages) {
                // This logic depends on the user object.
                // If a user sends a club message, and it gets duplicated (e.g., once as a general message, once to a specific recipient if club implements that),
                // we only want to show it once in the sender's thread.
                // The original code used msg.club_name in the outline comment, but the actual code used msg.club_id. Keeping msg.club_id as it's the correct field.
                if (msg.sender_id === user?.id && msg.club_id) { 
                    const broadcastSignature = `${getConversationId(msg)}-${msg.body}`;
                    if (seenBroadcasts.has(broadcastSignature)) {
                        continue;
                    }
                    seenBroadcasts.add(broadcastSignature);
                }
                uniqueMessages.push(msg);
            }
            return uniqueMessages;
        }, [conversation.messages, user]); // Changed dependency from user?.id to user to resolve potential linter warnings for React hook dependencies.

        const latestMessage = conversation.messages[conversation.messages.length - 1];
        if (!latestMessage) return null;
        
        const isUnread = conversation.unreadCount > 0;
        const otherParticipant = conversation.participants[0]; // Assuming participants array only has one other participant for direct, or club info.

        const handleToggleCollapsible = (open) => {
            if (open && isUnread) {
                markConversationAsRead(conversation.id); // Mark as read when expanded
            }
        };

        const handleReplyToConversation = () => {
            let replyToData;
            if (conversation.id.startsWith('club_')) { // Check if it's a club conversation
                replyToData = {
                    club_id: otherParticipant.id, // otherParticipant is the club
                    club_name: otherParticipant.name,
                    subject: conversation.subject?.startsWith('Re: ') ? conversation.subject : `Re: ${conversation.subject || 'Club Message'}`
                };
            } else { // Direct message
                replyToData = {
                    recipient_id: otherParticipant.id,
                    recipient_username: otherParticipant.name,
                    subject: conversation.subject?.startsWith('Re: ') ? conversation.subject : `Re: ${conversation.subject || 'Message'}`,
                    thread_id: conversation.id // The convId is the thread_id
                };
            }
            setReplyToMessage(replyToData);
            setComposerOpen(true);
        };

        return (
            <Collapsible onOpenChange={handleToggleCollapsible} className="border-b-2 border-white/20">
                <CollapsibleTrigger className="w-full text-left p-4 hover:bg-white/10 transition-colors">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full ${isUnread ? 'bg-[#f26222]' : 'bg-transparent'}`}></div>
                            <div>
                                <h4 className={`main-text font-bold ${isUnread ? 'text-[#5a3217]' : 'text-[#5a3217] opacity-70'}`}>
                                    {conversation.subject || `Conversation with ${otherParticipant.name}`}
                                </h4>
                                <p className="text-sm main-text opacity-60">
                                    {uniqueMessagesForDisplay.length} messages
                                </p>
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                            <p className="text-sm main-text opacity-60">
                                {formatDistanceToNow(latestMessage.created_date, { addSuffix: true })}
                            </p>
                            <p className="text-sm main-text opacity-60">
                                Last reply from: {latestMessage.sender_username === user?.username ? 'You' : latestMessage.sender_username}
                            </p>
                        </div>
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 bg-black/5">
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {uniqueMessagesForDisplay.map(msg => (
                            <div key={msg.id} className={`p-3 rounded-lg ${msg.sender_id === user.id ? 'bg-[#9fd3ba]' : 'bg-white/60'}`}>
                                <div className="flex justify-between items-center mb-1">
                                    <p className="font-bold main-text text-sm">{msg.sender_username === user.username ? 'You' : msg.sender_username}</p>
                                    <p className="text-xs main-text opacity-60">{format(new Date(msg.created_date), 'PPp')}</p>
                                </div>
                                <div className="prose prose-sm max-w-none main-text">
                                    <ReactMarkdown
                                        components={{
                                            a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} target="_blank" rel="noopener noreferrer" />,
                                            strong: ({node, ...props}) => <strong className="font-bold text-current" {...props} />,
                                        }}
                                    >
                                        {msg.body}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4">
                        <Button onClick={handleReplyToConversation}>
                            <Reply className="w-4 h-4 mr-2" /> Reply
                        </Button>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        );
    };

    if (loading || userLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
                <RefreshCw className="w-8 h-8 animate-spin main-text" />
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#e5e4cd' }}>
                <Card className="text-center">
                    <CardHeader><CardTitle className="text-red-500">Error</CardTitle></CardHeader>
                    <CardContent>
                        <p>{error}</p>
                        <Button onClick={() => fetchAndCategorizeMessages()} className="mt-4">Try Again</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <>
            <MessageComposerModal
                isOpen={isComposerOpen}
                onClose={() => { setComposerOpen(false); setReplyToMessage(null); }} // Reset replyToMessage on close
                onMessageSent={handleMessageSent}
                replyTo={replyToMessage}
            />
            <div className="min-h-screen" style={{ backgroundColor: '#e5e4cd' }}>
                <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="font-abolition text-4xl sm:text-5xl main-text">Messages</h1>
                        <Button onClick={() => { setReplyToMessage(null); setComposerOpen(true); }} style={{ backgroundColor: '#f26222', color: 'white' }}>
                            <Send className="w-4 h-4 mr-2" />
                            New Message
                        </Button>
                    </div>

                    <div className="mb-8">
                        <div className="flex relative border-b-2 border-[#5a3217] border-opacity-30">
                            <button
                                className={`px-4 pb-3 pt-2 text-sm font-semibold transition-colors focus:outline-none relative ${
                                    activeTab === 'direct' 
                                        ? 'text-[#5a3217]' 
                                        : 'text-[#5a3217] opacity-50 hover:opacity-100'
                                }`}
                                onClick={() => setActiveTab('direct')}
                            >
                                Direct Messages {directUnreadCount > 0 && `(${directUnreadCount > 9 ? '9+' : directUnreadCount})`}
                                {activeTab === 'direct' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#f26222]"></div>
                                )}
                            </button>
                            <button
                                className={`px-4 pb-3 pt-2 text-sm font-semibold transition-colors focus:outline-none relative ${
                                    activeTab === 'club' 
                                        ? 'text-[#5a3217]' 
                                        : 'text-[#5a3217] opacity-50 hover:opacity-100'
                                }`}
                                onClick={() => setActiveTab('club')}
                            >
                                Club Messages {clubUnreadCount > 0 && `(${clubUnreadCount > 9 ? '9+' : clubUnreadCount})`}
                                {activeTab === 'club' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#f26222]"></div>
                                )}
                            </button>
                            <button
                                className={`px-4 pb-3 pt-2 text-sm font-semibold transition-colors focus:outline-none relative ${
                                    activeTab === 'notifications' 
                                        ? 'text-[#5a3217]' 
                                        : 'text-[#5a3217] opacity-50 hover:opacity-100'
                                }`}
                                onClick={() => setActiveTab('notifications')}
                            >
                                Notifications {notificationsUnreadCount > 0 && `(${notificationsUnreadCount > 9 ? '9+' : notificationsUnreadCount})`}
                                {activeTab === 'notifications' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#f26222]"></div>
                                )}
                            </button>
                        </div>
                    </div>

                    {activeTab === 'direct' && (
                         <Card className="tool-card-bg border-0 elegant-shadow">
                            <CardContent className="p-0">
                                {Object.values(directMessages).length > 0 ? (
                                    Object.values(directMessages)
                                      .sort((a,b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime())
                                      .map(conv => <ConversationThread key={conv.id} conversation={conv} />)
                                ) : (
                                    <p className="p-8 text-center main-text opacity-70">You have no direct messages.</p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                    
                    {activeTab === 'club' && (
                        <Card className="tool-card-bg border-0 elegant-shadow">
                            <CardContent className="p-0">
                                {Object.values(clubMessages).length > 0 ? (
                                    Object.values(clubMessages)
                                      .sort((a,b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime())
                                      .map(conv => <ConversationThread key={conv.id} conversation={conv} />)
                                ) : (
                                    <p className="p-8 text-center main-text opacity-70">You are not a member of any clubs with messages.</p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="space-y-6">
                            {/* Actionable Notifications */}
                            {pendingFriendRequests.length > 0 && (
                                <FriendRequestNotifications friendRequests={pendingFriendRequests} onAction={fetchAndCategorizeMessages} />
                            )}
                            {pendingClubInvites.length > 0 && (
                                <ClubInvitationNotifications invites={pendingClubInvites} onAction={fetchAndCategorizeMessages} />
                            )}
                            {pendingScheduledMatchInvites.length > 0 && (
                                <ScheduledMatchInvitationNotifications invites={pendingScheduledMatchInvites} onAction={fetchAndCategorizeMessages} />
                            )}
                            {pendingLeagueInvites.length > 0 && (
                                 <Card className="tool-card-bg border-0 elegant-shadow" style={{ backgroundColor: '#007e81' }}>
                                    <CardHeader>
                                        <CardTitle className="text-bone-color flex items-center gap-3">
                                            <Trophy className="w-6 h-6" /> League Invitations
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {pendingLeagueInvites.map(invite => <LeagueInvitationCard key={invite.id} message={invite} onSuccess={fetchAndCategorizeMessages} onAction={fetchAndCategorizeMessages} />)}
                                    </CardContent>
                                </Card>
                            )}
                            {pendingTournamentInvites.length > 0 && (
                                <Card className="tool-card-bg border-0 elegant-shadow" style={{ backgroundColor: '#007e81' }}>
                                   <CardHeader>
                                       <CardTitle className="text-bone-color flex items-center gap-3">
                                           <Gamepad2 className="w-6 h-6" /> Tournament Invitations
                                       </CardTitle>
                                   </CardHeader>
                                   <CardContent className="space-y-3">
                                       {pendingTournamentInvites.map(invite => <TournamentInvitationCard key={invite.id} message={invite} onAction={fetchAndCategorizeMessages} />)}
                                   </CardContent>
                               </Card>
                            )}
                            {leagueProposals.length > 0 && (
                                <LeagueProposalNotificationCard proposals={leagueProposals} onAction={fetchAndCategorizeMessages} />
                            )}
                            
                            {/* General Notifications */}
                            <Card className="tool-card-bg border-0 elegant-shadow">
                                <CardHeader><CardTitle className="main-text">Past Notifications</CardTitle></CardHeader>
                                <CardContent>
                                    {generalNotifications.length > 0 ? (
                                        <ul className="space-y-2">
                                            {generalNotifications.map(notification => (
                                                <li key={notification.id} className={`p-3 rounded-md ${notification.status === 'unread' && notification.recipient_id === user.id ? 'bg-white/70' : 'bg-white/20'}`}>
                                                    <p className="main-text font-semibold">{notification.subject}</p>
                                                    <div className="prose prose-sm max-w-none main-text opacity-80 mt-1">
                                                        <ReactMarkdown
                                                            components={{
                                                                a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} target="_blank" rel="noopener noreferrer" />,
                                                                strong: ({node, ...props}) => <strong className="font-bold text-current" {...props} />,
                                                            }}
                                                        >
                                                            {notification.body}
                                                        </ReactMarkdown>
                                                    </div>
                                                    <p className="text-xs main-text opacity-50 mt-2">
                                                        {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
                                                    </p>
                                                    {notification.status === 'unread' && notification.recipient_id === user.id && (
                                                        <Button 
                                                            size="sm" 
                                                            className="mt-2"
                                                            style={{ backgroundColor: '#9fd3ba', color: '#5a3217' }}
                                                            onClick={async () => {
                                                                try {
                                                                    await Message.update(notification.id, { status: 'read' });
                                                                    fetchAndCategorizeMessages();
                                                                } catch (err) {
                                                                    console.error("Failed to mark notification as read:", err);
                                                                    alert("Failed to mark notification as read.");
                                                                }
                                                            }}
                                                        >
                                                            <Check className="w-4 h-4 mr-2" /> Mark as Read
                                                        </Button>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                         <p className="p-4 text-center main-text opacity-70">No past notifications.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
