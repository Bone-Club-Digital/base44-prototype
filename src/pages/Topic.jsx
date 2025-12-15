
import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ForumTopic } from '@/entities/ForumTopic';
import { ForumPost } from '@/entities/ForumPost';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, MessageSquare, User as UserIcon, Calendar, 
  Pin, Lock, Reply, Send, AlertCircle 
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function TopicPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Get topic ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get('id');

  const fetchTopicAndPosts = useCallback(async () => {
    // Only attempt to fetch if topicId is available.
    // The useEffect will handle the navigation if topicId is missing initially.
    if (!topicId) return; 
    
    try {
      const [topicData, postsList] = await Promise.all([
        ForumTopic.list().then(topics => topics.find(t => t.id === topicId)),
        ForumPost.filter({ topic_id: topicId }, 'created_date')
      ]);

      if (!topicData) {
        navigate(createPageUrl('ClubHouse'));
        return;
      }

      setTopic(topicData);
      setPosts(postsList);
    } catch (error) {
      console.error('Error fetching topic:', error);
    } finally {
      setLoading(false);
    }
  }, [topicId, navigate]); // Dependencies for useCallback: topicId and navigate

  useEffect(() => {
    if (!topicId) {
      navigate(createPageUrl('ClubHouse'));
      return;
    }
    fetchTopicAndPosts();
  }, [topicId, navigate, fetchTopicAndPosts]); // Dependencies for useEffect: topicId, navigate, and fetchTopicAndPosts

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!user || !newPost.trim() || topic.is_locked) return;

    setSubmitting(true);
    try {
      await ForumPost.create({
        topic_id: topicId,
        content: newPost.trim(),
        author_id: user.id,
        author_username: user.username || user.full_name,
        author_profile_picture: user.profile_picture_url || ''
      });

      // Update topic reply count and last reply info
      await ForumTopic.update(topicId, {
        reply_count: (topic.reply_count || 0) + 1,
        last_reply_date: new Date().toISOString(),
        last_reply_author: user.username || user.full_name
      });

      setNewPost('');
      await fetchTopicAndPosts(); // Refetch to show new post
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to post reply. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#5a3217] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="main-text">Loading discussion...</p>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="max-w-4xl mx-auto text-center py-12">
          <AlertCircle className="w-16 h-16 main-text opacity-50 mx-auto mb-4" />
          <h2 className="text-2xl font-bold main-text mb-2">Topic Not Found</h2>
          <p className="main-text opacity-70 mb-4">The discussion you're looking for doesn't exist or has been removed.</p>
          <Link to={createPageUrl('ClubHouse')}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Club House
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="mb-6">
          <Link 
            to={createPageUrl('ClubHouse')} 
            className="flex items-center gap-2 hover:opacity-70 transition-colors main-text"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Club House</span>
          </Link>
        </div>

        {/* Topic Header */}
        <Card className="tool-card-bg border-0 elegant-shadow mb-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-3">
                  {topic.is_pinned && <Pin className="w-5 h-5 text-orange-500" />}
                  {topic.is_locked && <Lock className="w-5 h-5 text-red-500" />}
                  <h1 className="text-2xl font-bold main-text">{topic.title}</h1>
                </div>
                
                <div className="flex items-center gap-4 text-sm main-text opacity-60 mb-4">
                  <div className="flex items-center gap-1">
                    <UserIcon className="w-4 h-4" />
                    <span>{topic.author_username}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(topic.created_date), 'PPP')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    <span>{posts.length} replies</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="prose max-w-none">
              <p className="main-text whitespace-pre-wrap">{topic.content}</p>
            </div>
          </CardContent>
        </Card>

        {/* Posts */}
        {posts.length > 0 && (
          <Card className="tool-card-bg border-0 elegant-shadow mb-6">
            <CardHeader>
              <CardTitle className="main-text flex items-center gap-2">
                <Reply className="w-5 h-5" />
                Replies ({posts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {posts.map((post, index) => (
                <div key={post.id} className="p-4 bg-white/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {post.author_profile_picture ? (
                        <img
                          src={post.author_profile_picture}
                          alt={post.author_username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#5a3217] flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold main-text">{post.author_username}</span>
                        <span className="text-xs main-text opacity-50">
                          #{index + 1} • {formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}
                        </span>
                        {post.is_edited && (
                          <Badge variant="outline" className="text-xs">
                            Edited
                          </Badge>
                        )}
                      </div>
                      <div className="prose max-w-none">
                        <p className="main-text whitespace-pre-wrap">{post.content}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Reply Form */}
        {user && !topic.is_locked && (
          <Card className="tool-card-bg border-0 elegant-shadow">
            <CardContent className="p-6">
              <form onSubmit={handleCreatePost} className="space-y-4">
                <h3 className="text-lg font-bold main-text">Post a Reply</h3>
                <Textarea
                  placeholder="What are your thoughts?"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  className="min-h-24"
                  maxLength={5000}
                  required
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={submitting || !newPost.trim()}
                    style={{ backgroundColor: '#007e81', color: 'white' }}
                    className="flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? 'Posting...' : 'Post Reply'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Locked/Not Logged In Messages */}
        {topic.is_locked && (
          <Card className="border-amber-200 bg-amber-50 mt-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-600" />
                <p className="text-amber-800">This topic has been locked and no longer accepts new replies.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!user && !topic.is_locked && (
          <Card className="border-blue-200 bg-blue-50 mt-6">
            <CardContent className="p-4">
              <p className="text-blue-800">
                <Link to={createPageUrl('Home')} className="underline hover:text-blue-600">
                  Please log in
                </Link> to join the discussion.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
