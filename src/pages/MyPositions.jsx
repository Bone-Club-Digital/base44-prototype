import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../components/auth/UserProvider';
import { SharedGameSnapshot } from '@/entities/SharedGameSnapshot';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageIcon, RefreshCw, Layers } from 'lucide-react';

export default function MyPositionsPage() {
  const { user } = useUser();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const fetchPositions = async () => {
        setLoading(true);
        try {
          const savedPositions = await SharedGameSnapshot.filter(
            { user_id: user.id },
            '-created_date'
          );
          setPositions(savedPositions);
        } catch (error) {
          console.error("Failed to fetch saved positions:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchPositions();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin main-text" />
        <p className="ml-4 text-lg main-text">Loading your saved positions...</p>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-16">
        <Layers className="w-16 h-16 mx-auto main-text opacity-50 mb-4" />
        <h2 className="text-2xl font-bold main-text mb-2">No Saved Positions Yet</h2>
        <p className="main-text opacity-70 mb-6">
          You can save a snapshot of any game from the game screen.
        </p>
        <Link to={createPageUrl('Home')}>
          <Button style={{ backgroundColor: '#f26222', color: 'white' }}>
            Play a Game
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center mb-8">
        <ImageIcon className="w-8 h-8 main-text mr-4" />
        <h1 className="text-4xl font-bold main-text font-abolition">My Saved Positions</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {positions.map((snapshot) => (
          <Link key={snapshot.id} to={createPageUrl(`SharedGameSnapshot?id=${snapshot.id}`)}>
            <Card className="tool-card-bg border-0 elegant-shadow overflow-hidden group hover:scale-105 transition-transform duration-300">
              <div className="aspect-video overflow-hidden">
                <img 
                  src={snapshot.screenshot_url} 
                  alt={snapshot.title}
                  className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                />
              </div>
              <CardHeader>
                <CardTitle className="main-text truncate">{snapshot.title}</CardTitle>
                <CardDescription className="main-text opacity-70 h-10 overflow-hidden text-ellipsis">
                  {snapshot.description || 'No description.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                 <p className="text-xs main-text opacity-50">
                   Saved on {new Date(snapshot.created_date).toLocaleDateString()}
                 </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}