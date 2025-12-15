import React, { useState, useEffect } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ForumTopic } from '@/entities/ForumTopic';
import { ForumCategory } from '@/entities/ForumCategory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MessageSquare, Plus, User as UserIcon, Calendar, Pin, Lock, 
  Search, RefreshCw, AlertCircle 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ClubHousePage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredTopics, setFilteredTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [newTopic, setNewTopic] = useState({
    title: '',
    content: '',
    category_id: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [topicsList, categoriesList] = await Promise.all([
        ForumTopic.filter({ status: 'active' }, '-created_date'),
        ForumCategory.filter({ is_active: true }, 'sort_order')
      ]);
      
      setTopics(topicsList);
      setCategories(categoriesList);
      setFilteredTopics(topicsList);
    } catch (error) {
      console.error('Error fetching forum data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter topics based on selected category and search term
  useEffect(() => {
    let filtered = topics;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(topic => topic.category_id === selectedCategory);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(topic => 
        topic.title.toLowerCase().includes(term) || 
        topic.content.toLowerCase().includes(term)
      );
    }

    setFilteredTopics(filtered);
  }, [topics, selectedCategory, searchTerm]);

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!user || !newTopic.title.trim() || !newTopic.content.trim() || !newTopic.category_id) {
      return;
    }

    setSubmitting(true);
    try {
      const selectedCategoryData = categories.find(cat => cat.id === newTopic.category_id);
      
      await ForumTopic.create({
        title: newTopic.title.trim(),
        content: newTopic.content.trim(),
        category_id: newTopic.category_id,
        category_name: selectedCategoryData?.name || 'Unknown',
        author_id: user.id,
        author_username: user.username || user.full_name || 'Anonymous'
      });

      setNewTopic({ title: '', content: '', category_id: '' });
      setShowCreateForm(false);
      fetchData();
    } catch (error) {
      console.error('Error creating topic:', error);
      alert('Failed to create topic. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryColor = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || '#007e81';
  };

  const getCategoryStats = () => {
    return categories.map(category => ({
      ...category,
      topicCount: topics.filter(topic => topic.category_id === category.id).length
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <RefreshCw className="w-8 h-8 animate-spin main-text" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="font-abolition text-4xl sm:text-5xl text-[#5a3217]">Club House Forum</h1>
            <p className="main-text opacity-70 mt-2">Connect with the community, share knowledge, and get help</p>
          </div>
          {user && (
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              style={{ backgroundColor: '#f26222', color: 'white' }}
              className="flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Topic
            </Button>
          )}
        </div>

        {/* Category Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {getCategoryStats().map(category => (
            <Card 
              key={category.id} 
              className="tool-card-bg border-0 elegant-shadow cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setSelectedCategory(category.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold main-text">{category.name}</h3>
                    <p className="text-sm main-text opacity-70">{category.description}</p>
                    <p className="text-xs main-text opacity-60 mt-1">{category.topicCount} topics</p>
                  </div>
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create Topic Form */}
        {showCreateForm && user && (
          <Card className="tool-card-bg border-0 elegant-shadow mb-6">
            <CardHeader>
              <CardTitle className="main-text">Create New Topic</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTopic} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium main-text mb-2">Category</label>
                  <Select 
                    value={newTopic.category_id} 
                    onValueChange={(value) => setNewTopic({...newTopic, category_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium main-text mb-2">Title</label>
                  <Input
                    value={newTopic.title}
                    onChange={(e) => setNewTopic({...newTopic, title: e.target.value})}
                    placeholder="Enter topic title..."
                    className="bg-white/30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium main-text mb-2">Content</label>
                  <Textarea
                    value={newTopic.content}
                    onChange={(e) => setNewTopic({...newTopic, content: e.target.value})}
                    placeholder="Write your message..."
                    className="bg-white/30 min-h-32"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitting || !newTopic.category_id}
                    style={{ backgroundColor: '#007e81', color: 'white' }}
                  >
                    {submitting ? 'Creating...' : 'Create Topic'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filters and Search */}
        <Card className="tool-card-bg border-0 elegant-shadow mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 main-text opacity-50" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search topics..."
                    className="pl-10 bg-white/30"
                  />
                </div>
              </div>
              <div className="md:w-48">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Topics List */}
        <Card className="tool-card-bg border-0 elegant-shadow">
          <CardHeader>
            <CardTitle className="main-text flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Topics ({filteredTopics.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTopics.length === 0 ? (
              <div className="text-center py-8 main-text opacity-70">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                {searchTerm || selectedCategory !== 'all' ? (
                  <p>No topics found matching your filters.</p>
                ) : (
                  <p>No topics yet. {user ? 'Be the first to start a discussion!' : 'Login to start a discussion!'}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTopics.map(topic => (
                  <div
                    key={topic.id}
                    className="flex items-start gap-4 p-4 rounded-lg bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
                    onClick={() => navigate(createPageUrl(`Topic?id=${topic.id}`))}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          className="text-xs"
                          style={{ 
                            backgroundColor: getCategoryColor(topic.category_id),
                            color: 'white'
                          }}
                        >
                          {topic.category_name}
                        </Badge>
                        {topic.is_pinned && <Pin className="w-4 h-4 text-yellow-600" />}
                        {topic.is_locked && <Lock className="w-4 h-4 text-red-600" />}
                      </div>
                      <h3 className="font-semibold main-text mb-1">{topic.title}</h3>
                      <p className="text-sm main-text opacity-70 line-clamp-2">
                        {topic.content.substring(0, 150)}...
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs main-text opacity-60">
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          {topic.author_username}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDistanceToNow(new Date(topic.created_date), { addSuffix: true })}
                        </span>
                        {topic.reply_count > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {topic.reply_count} replies
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Login prompt for non-authenticated users */}
        {!user && (
          <Card className="tool-card-bg border-0 elegant-shadow mt-6">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 main-text opacity-50" />
              <h3 className="text-lg font-semibold main-text mb-2">Join the Discussion</h3>
              <p className="main-text opacity-70 mb-4">Login to create topics and participate in conversations</p>
              <Button 
                onClick={() => window.location.reload()}
                style={{ backgroundColor: '#f26222', color: 'white' }}
              >
                Login to Participate
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}