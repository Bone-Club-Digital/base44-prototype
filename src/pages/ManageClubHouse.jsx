import React, { useState, useEffect } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ForumTopic } from '@/entities/ForumTopic';
import { ForumPost } from '@/entities/ForumPost';
import { ForumCategory } from '@/entities/ForumCategory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, MessageSquare, Pin, Lock, Trash2, Edit, Plus, Settings, RefreshCw, Palette
} from 'lucide-react';
import { format } from 'date-fns';
import ColorPickerModal from '../components/ui/ColorPickerModal';

export default function ManageClubHousePage() {
  const { user, loading } = useUser();
  const [topics, setTopics] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({ totalTopics: 0, totalPosts: 0, activeUsers: 0 });
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Category management state
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: '#007e81',
    sort_order: 0
  });

  const fetchData = async () => {
    try {
      const [topicsList, categoriesList, postsList] = await Promise.all([
        ForumTopic.list(),
        ForumCategory.list(),
        ForumPost.list()
      ]);

      setTopics(topicsList);
      setCategories(categoriesList.sort((a, b) => a.sort_order - b.sort_order));

      // Calculate stats
      const activeUsers = new Set([
        ...topicsList.map(t => t.author_id),
        ...postsList.map(p => p.author_id)
      ]).size;

      setStats({
        totalTopics: topicsList.length,
        totalPosts: postsList.length,
        activeUsers
      });
    } catch (error) {
      console.error('Error fetching forum management data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'admin' || user.is_forum_admin)) {
      fetchData();
    }
  }, [user]);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.name.trim()) return;

    try {
      await ForumCategory.create({
        ...newCategory,
        name: newCategory.name.trim(),
        description: newCategory.description.trim(),
        sort_order: categories.length
      });

      setNewCategory({ name: '', description: '', color: '#007e81', sort_order: 0 });
      setShowCreateCategory(false);
      fetchData();
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category.');
    }
  };

  const handleUpdateCategory = async (categoryId, updates) => {
    try {
      await ForumCategory.update(categoryId, updates);
      setEditingCategory(null);
      fetchData();
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category.');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    const topicsInCategory = topics.filter(t => t.category_id === categoryId).length;
    
    if (topicsInCategory > 0) {
      alert(`Cannot delete category with ${topicsInCategory} topics. Move or delete topics first.`);
      return;
    }

    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      await ForumCategory.delete(categoryId);
      fetchData();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category.');
    }
  };

  const handleToggleTopicPin = async (topicId, isPinned) => {
    try {
      await ForumTopic.update(topicId, { is_pinned: !isPinned });
      fetchData();
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const handleToggleTopicLock = async (topicId, isLocked) => {
    try {
      await ForumTopic.update(topicId, { is_locked: !isLocked });
      fetchData();
    } catch (error) {
      console.error('Error toggling lock:', error);
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm('Are you sure you want to delete this topic? This action cannot be undone.')) return;

    try {
      await ForumTopic.update(topicId, { status: 'deleted' });
      fetchData();
    } catch (error) {
      console.error('Error deleting topic:', error);
      alert('Failed to delete topic.');
    }
  };

  // Access control
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <RefreshCw className="w-8 h-8 animate-spin main-text" />
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && !user.is_forum_admin)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <Card className="tool-card-bg border-0 elegant-shadow text-center p-8">
          <h2 className="text-2xl font-bold main-text mb-2">Access Denied</h2>
          <p className="main-text opacity-70 mb-6">You don't have permission to access this page.</p>
          <Button asChild variant="outline">
            <Link to={createPageUrl('ClubHouse')}>Back to Club House</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
              <Link to={createPageUrl('ClubHouse')}>
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="font-abolition text-4xl sm:text-5xl text-[#5a3217]">Manage Club House</h1>
              <p className="main-text opacity-70 mt-1">Forum administration and moderation tools</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            onClick={() => setActiveTab('overview')}
            style={activeTab === 'overview' ? { backgroundColor: '#007e81', color: 'white' } : {}}
          >
            Overview
          </Button>
          <Button
            variant={activeTab === 'categories' ? 'default' : 'outline'}
            onClick={() => setActiveTab('categories')}
            style={activeTab === 'categories' ? { backgroundColor: '#007e81', color: 'white' } : {}}
          >
            Categories
          </Button>
          <Button
            variant={activeTab === 'topics' ? 'default' : 'outline'}
            onClick={() => setActiveTab('topics')}
            style={activeTab === 'topics' ? { backgroundColor: '#007e81', color: 'white' } : {}}
          >
            Topics
          </Button>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="w-8 h-8 animate-spin main-text" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="tool-card-bg border-0 elegant-shadow">
                  <CardHeader>
                    <CardTitle className="main-text flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Total Topics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold main-text">{stats.totalTopics}</p>
                  </CardContent>
                </Card>

                <Card className="tool-card-bg border-0 elegant-shadow">
                  <CardHeader>
                    <CardTitle className="main-text flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Total Posts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold main-text">{stats.totalPosts}</p>
                  </CardContent>
                </Card>

                <Card className="tool-card-bg border-0 elegant-shadow">
                  <CardHeader>
                    <CardTitle className="main-text flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Categories
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold main-text">{categories.length}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Categories Tab */}
            {activeTab === 'categories' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold main-text">Forum Categories</h2>
                  <Button
                    onClick={() => setShowCreateCategory(true)}
                    style={{ backgroundColor: '#f26222', color: 'white' }}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Category
                  </Button>
                </div>

                {/* Create Category Form */}
                {showCreateCategory && (
                  <Card className="tool-card-bg border-0 elegant-shadow">
                    <CardHeader>
                      <CardTitle className="main-text">Create New Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleCreateCategory} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium main-text mb-2">Name</label>
                          <Input
                            value={newCategory.name}
                            onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                            placeholder="e.g., Help & Support"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium main-text mb-2">Description</label>
                          <Textarea
                            value={newCategory.description}
                            onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                            placeholder="Brief description of this category..."
                            className="min-h-20"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium main-text mb-2">Color</label>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded cursor-pointer border-2 border-white"
                              style={{ backgroundColor: newCategory.color }}
                              onClick={() => setShowColorPicker(true)}
                            />
                            <Input
                              value={newCategory.color}
                              onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                              className="w-32"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowColorPicker(true)}
                            >
                              <Palette className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-end gap-3">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowCreateCategory(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" style={{ backgroundColor: '#007e81', color: 'white' }}>
                            Create Category
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {/* Categories List */}
                <div className="grid gap-4">
                  {categories.map(category => (
                    <Card key={category.id} className="tool-card-bg border-0 elegant-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <div>
                              <h3 className="font-semibold main-text">{category.name}</h3>
                              <p className="text-sm main-text opacity-70">{category.description}</p>
                              <p className="text-xs main-text opacity-60">
                                {topics.filter(t => t.category_id === category.id).length} topics
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingCategory(category)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Topics Tab */}
            {activeTab === 'topics' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold main-text">Recent Topics</h2>
                
                <div className="space-y-4">
                  {topics.filter(t => t.status === 'active').slice(0, 20).map(topic => (
                    <Card key={topic.id} className="tool-card-bg border-0 elegant-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge 
                                className="text-xs"
                                style={{ 
                                  backgroundColor: categories.find(c => c.id === topic.category_id)?.color || '#007e81',
                                  color: 'white'
                                }}
                              >
                                {topic.category_name}
                              </Badge>
                              {topic.is_pinned && <Pin className="w-4 h-4 text-yellow-600" />}
                              {topic.is_locked && <Lock className="w-4 h-4 text-red-600" />}
                            </div>
                            <h3 className="font-semibold main-text mb-1">
                              <Link 
                                to={createPageUrl(`Topic?id=${topic.id}`)} 
                                className="hover:underline"
                              >
                                {topic.title}
                              </Link>
                            </h3>
                            <p className="text-sm main-text opacity-70 mb-2">
                              By {topic.author_username} • {format(new Date(topic.created_date), 'PPp')}
                            </p>
                            <p className="text-sm main-text opacity-60">
                              {topic.reply_count} replies
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleTopicPin(topic.id, topic.is_pinned)}
                            >
                              <Pin className={`w-4 h-4 ${topic.is_pinned ? 'text-yellow-600' : ''}`} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleTopicLock(topic.id, topic.is_locked)}
                            >
                              <Lock className={`w-4 h-4 ${topic.is_locked ? 'text-red-600' : ''}`} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteTopic(topic.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Color Picker Modal */}
        <ColorPickerModal
          isOpen={showColorPicker}
          onClose={() => setShowColorPicker(false)}
          currentColor={newCategory.color}
          onColorChange={(color) => setNewCategory({...newCategory, color})}
        />
      </div>
    </div>
  );
}