
import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '../auth/UserProvider';
import { Message } from '@/entities/Message';
import { Club } from '@/entities/Club'; // Assuming a Club entity exists for fetching club details
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Send, PlusCircle, Trash2, ArrowDown, ArrowUp, MessageSquare, Reply } from 'lucide-react'; // Updated icons
import { format } from 'date-fns';
import MessageComposerModal from '../messages/MessageComposerModal';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import ReactMarkdown from 'react-markdown';
import PaginationControls from '../layout/PaginationControls';

const ITEMS_PER_PAGE = 10;

export default function ClubMessagesList({ clubId, clubName, messages: initialMessages, onRefresh }) { // Removed isAdmin prop, added messages and onRefresh
  const { user } = useUser();
  const [messages, setMessages] = useState(initialMessages || []);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [expandedThreads, setExpandedThreads] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [club, setClub] = useState(null); // State to hold club details

  // Fetch club details
  useEffect(() => {
    const fetchClubDetails = async () => {
      try {
        const clubDetails = await Club.get(clubId); // Assuming Club.get method exists
        setClub(clubDetails);
      } catch (error) {
        console.error("Failed to fetch club details:", error);
        // Optionally handle error state for club details
      }
    };

    if (clubId) {
      fetchClubDetails();
    }
  }, [clubId]);

  useEffect(() => {
    setMessages(initialMessages || []);
  }, [initialMessages]);

  const canSendClubwideMessage = useMemo(() => {
    if (!user || !club) return false;
    // Check if user is admin (either primary admin or in admin_ids array)
    return club.admin_id === user.id || (club.admin_ids && club.admin_ids.includes(user.id));
  }, [user, club]);

  const handleMarkAsRead = async (message) => {
    if (message.status === 'read' || message.sender_id === user?.id) return; // Added user?.id for safety
    try {
      await Message.update(message.id, { status: 'read' });

      setMessages(prevMessages =>
        prevMessages.map(m =>
          m.id === message.id ? { ...m, status: 'read' } : m
        )
      );
      // Also notify parent to refetch if needed, though local update is faster
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    }
  };

  const handleMarkConversationAsRead = async (conversationMessages) => {
    try {
      const unreadMessagesInConversation = conversationMessages.filter(m => m.sender_id !== user?.id && m.status === 'unread'); // Added user?.id
      if (unreadMessagesInConversation.length > 0) {
        const updatePromises = unreadMessagesInConversation.map(msg => Message.update(msg.id, { status: 'read' }));
        await Promise.all(updatePromises);

        setMessages(prevMessages =>
          prevMessages.map(m =>
            unreadMessagesInConversation.find(um => um.id === m.id) ? { ...m, status: 'read' } : m
          )
        );
      }
    } catch (error) {
      console.error("Failed to mark conversation as read:", error);
    }
  };

  const handleDelete = async (messageId) => {
    if (confirm("Are you sure you want to delete this message?")) {
      try {
        await Message.delete(messageId);
        setMessages(prevMessages => prevMessages.filter(m => m.id !== messageId));
      } catch (error) {
        console.error("Failed to delete message:", error);
        alert("Could not delete message.");
      }
    }
  };

  const handleReply = (message) => {
    setReplyTo({
      club_name: clubName,
      club_id: clubId,
      subject: message.subject?.startsWith('Re: ') ? message.subject : `Re: ${message.subject || 'Message'}`,
      thread_id: message.thread_id || message.id
    });
    setComposerOpen(true);
  };

  const handleReplyToConversation = (conversation) => {
    setReplyTo({
      club_name: clubName,
      club_id: clubId,
      thread_id: conversation.threadId,
      subject: conversation.subject?.startsWith('Re: ') ? conversation.subject : `Re: ${conversation.subject || 'Message'}`
    });
    setComposerOpen(true);
  };

  const handleNewMessage = () => {
    setReplyTo(null); // Ensure we are not in reply mode
    setComposerOpen(true);
  };

  const toggleThread = (threadId) => {
    setExpandedThreads(prev => ({
      ...prev,
      [threadId]: !prev[threadId]
    }));
  };

  const groupConversations = (messagesToGroup) => {
    const conversations = {};

    messagesToGroup.forEach(msg => {
      const threadIdentifier = msg.thread_id || msg.id;
      const conversationKey = `thread-${threadIdentifier}`;

      if (!conversations[conversationKey]) {
        conversations[conversationKey] = {
          messages: [],
          subject: msg.subject,
          threadId: threadIdentifier
        };
      }
      conversations[conversationKey].messages.push(msg);
    });

    return Object.values(conversations).map(conversation => {
      conversation.messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      return conversation;
    }).sort((a, b) => {
        const lastMessageA = a.messages[a.messages.length - 1];
        const lastMessageB = b.messages[b.messages.length - 1];
        if (!lastMessageB) return -1;
        if (!lastMessageA) return 1;
        return new Date(lastMessageB.created_date) - new Date(lastMessageA.created_date);
    });
  };

  const groupedConversations = useMemo(() => {
    return groupConversations(messages);
  }, [messages]);

  const totalPages = Math.ceil(groupedConversations.length / ITEMS_PER_PAGE);
  const paginatedConversations = groupedConversations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    // Reset to page 1 if filters change and current page is out of bounds
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const ConversationThread = ({ conversation }) => {
    const threadId = conversation.threadId;
    const isExpanded = !!expandedThreads[threadId];
    const unreadCount = conversation.messages.filter(m => m.sender_id !== user?.id && m.status === 'unread').length;

    const uniqueMessagesForDisplay = useMemo(() => {
        const uniqueMessages = [];
        const seenBroadcasts = new Set();

        for (const msg of conversation.messages) {
            // Check if the message is a broadcast from the current user (sender_id === user.id)
            // and if it has a thread_id (indicating it's part of a conversation)
            // and if a similar broadcast has already been added to uniqueMessages
            if (user && msg.sender_id === user.id && msg.thread_id) {
                // Create a signature for the broadcast to identify duplicates (thread_id + body)
                const broadcastSignature = `${msg.thread_id}-${msg.body}`;
                if (seenBroadcasts.has(broadcastSignature)) {
                    continue; // Skip if this broadcast has already been seen for this thread
                }
                seenBroadcasts.add(broadcastSignature);
            }
            uniqueMessages.push(msg);
        }
        return uniqueMessages;
    }, [conversation.messages, user]); // Dependency changed from user.id to user

    const latestMessage = conversation.messages[conversation.messages.length - 1];
    if (!latestMessage) return null;


    const handleExpand = () => {
      toggleThread(threadId);
      if (!isExpanded && unreadCount > 0) {
        handleMarkConversationAsRead(conversation.messages);
      }
    };

    const handleDeleteConversation = async () => {
      if (confirm(`Are you sure you want to delete this entire conversation? This will delete all ${conversation.messages.length} messages and cannot be undone.`)) {
        try {
          const deletePromises = conversation.messages.map(msg => Message.delete(msg.id));
          await Promise.all(deletePromises);

          const deletedIds = new Set(conversation.messages.map(m => m.id));
          setMessages(prevMessages => prevMessages.filter(m => !deletedIds.has(m.id)));
        } catch (error) {
          console.error("Failed to delete conversation:", error);
          alert("Could not delete conversation. Please try again.");
        }
      }
    };

    const MessageItem = ({ message }) => {
      const isOutgoing = message.sender_id === user?.id;
      const isUnread = !isOutgoing && message.status === 'unread';

      return (
        <Card
          className={`border-0 elegant-shadow transition-colors ${
            isUnread ? 'bg-white/80' : isOutgoing ? 'bg-white/10' : 'bg-white/30'
          }`}
          onClick={() => handleMarkAsRead(message)}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isOutgoing ? (
                      <Send className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Reply className="w-4 h-4 text-green-600" />
                    )}
                    <p className="font-bold main-text">
                      {isOutgoing ? `You: ${message.subject || 'Message'}` : `${message.sender_username || 'Unknown'}: ${message.subject || 'Message'}`}
                    </p>
                    {isUnread && (
                      <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#f26222', color: '#e5e4cd' }}>
                        new
                      </span>
                    )}
                  </div>
                  <div className="text-xs main-text opacity-60 text-right ml-4">
                    <div>{format(new Date(message.created_date), 'MMM d, yyyy')}</div>
                    <div>{format(new Date(message.created_date), 'h:mm a')}</div>
                  </div>
                </div>
                <div className="text-sm main-text max-w-none">
                  <ReactMarkdown
                    components={{
                      a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} target="_blank" rel="noopener noreferrer" />,
                      strong: ({node, ...props}) => <strong className="font-bold text-current" {...props} />,
                    }}
                  >
                    {message.body}
                  </ReactMarkdown>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700"
                  onClick={(e) => {e.stopPropagation(); handleDelete(message.id);}}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    };

    return (
      <div className="space-y-2">
        <Collapsible
          open={isExpanded}
          onOpenChange={handleExpand}
        >
          <Card
            className={`border-0 elegant-shadow transition-colors group ${
              unreadCount > 0 ? 'bg-white/70' : 'bg-white/30'
            } hover:bg-white/50 cursor-pointer`}
            onClick={handleExpand}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2 p-2 -m-2 rounded-md">
                    {isExpanded ? (
                      <ArrowUp className="w-4 h-4 main-text" />
                    ) : (
                      <ArrowDown className="w-4 h-4 main-text" />
                    )}
                  </div>
                  <MessageSquare className="w-5 h-5 text-green-600" /> {/* Changed icon */}
                  <div className="flex-1">
                    <p className="font-bold main-text">
                      {conversation.subject || 'Club Message'}
                    </p>
                    <p className="text-sm main-text opacity-70">
                      {uniqueMessagesForDisplay.length} message{uniqueMessagesForDisplay.length !== 1 ? 's' : ''}
                      {unreadCount > 0 && (
                        <span className="ml-2 px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#f26222', color: '#e5e4cd' }}>
                          {unreadCount} new
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-blue-500 hover:text-blue-700 z-10"
                      onClick={(e) => {e.stopPropagation(); handleReplyToConversation(conversation);}}
                      title="Reply to conversation"
                    >
                      <Reply className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 z-10"
                      onClick={(e) => {e.stopPropagation(); handleDeleteConversation();}}
                      title="Delete entire conversation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="text-xs main-text opacity-60 text-right ml-2">
                      <div>{format(new Date(latestMessage.created_date), 'MMM d')}</div>
                      <div>{format(new Date(latestMessage.created_date), 'h:mm a')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CollapsibleContent className="px-4 pb-4 cursor-default" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {uniqueMessagesForDisplay.map(msg => (
                  <MessageItem key={msg.id} message={msg} />
                ))}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    );
  };

  return (
    <>
      <MessageComposerModal
        isOpen={isComposerOpen}
        onClose={() => {setComposerOpen(false); setReplyTo(null);}}
        onMessageSent={() => {
          if (onRefresh) onRefresh();
          setReplyTo(null);
        }}
        replyTo={replyTo}
        initialClub={{ club_id: clubId, club_name: clubName }}
      />

      <Card className="tool-card-bg border-0 elegant-shadow">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="main-text flex items-center gap-2"> {/* Changed gap from 3 to 2 */}
            <MessageSquare className="w-5 h-5" /> {/* Changed icon and size */}
            Club Messages
          </CardTitle>
          {canSendClubwideMessage && ( // Conditional rendering based on admin status
            <Button
              onClick={handleNewMessage} // Using existing handler
              style={{ backgroundColor: '#5a3217', color: '#e5e4cd' }} // Updated styling
              size="sm" // Added size prop
            >
              <PlusCircle className="w-4 h-4 mr-2" /> {/* Changed icon */}
              New Message
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {!initialMessages ? (
             <div className="flex justify-center p-8"><RefreshCw className="w-8 h-8 animate-spin main-text" /></div>
          ) : groupedConversations.length > 0 ? (
            <>
              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
                {paginatedConversations.map((conversation, index) => (
                  <ConversationThread key={`club-conv-${conversation.threadId || index}`} conversation={conversation} />
                ))}
              </div>
              <div className="pt-4">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={ITEMS_PER_PAGE}
                  totalItems={groupedConversations.length}
                  noun="conversations"
                />
              </div>
            </>
          ) : (
            <div className="text-center main-text opacity-70 p-8">
              <p>No messages in this club yet.</p>
              <p className="text-sm">Be the first to send one!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
