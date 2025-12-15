
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Club } from '@/entities/Club';
import { ClubEvent } from '@/entities/ClubEvent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash2, Calendar, Clock, MapPin, DollarSign, RefreshCw, Shield, Plus } from 'lucide-react';
import CreateEventModal from '../components/clubs/CreateEventModal';
import { format } from 'date-fns';

export default function ManageEventsPage() {
  const { user, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const clubId = new URLSearchParams(location.search).get('club_id');

  const [club, setClub] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);

  // Update admin check to include admin_ids array
  const isCurrentUserAdmin = useMemo(() => {
    if (!user || !club) return false;
    // Check if user is the primary admin or included in the admin_ids array
    return club.admin_id === user.id || (club.admin_ids && club.admin_ids.includes(user.id));
  }, [user, club]);

  const fetchClubAndEvents = useCallback(async () => {
    if (!clubId) {
      setError("No Club ID provided.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const clubData = await Club.get(clubId);
      if (!clubData) throw new Error("Club not found.");
      
      // Removed the direct navigation if not admin here.
      // The access denial will be handled by the render logic using `isCurrentUserAdmin`.
      setClub(clubData);
      
      const eventData = await ClubEvent.filter({ club_id: clubId });
      setEvents(eventData.sort((a, b) => new Date(b.start_time) - new Date(a.start_time)));
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clubId, user]); // `navigate` is no longer a dependency for this `useCallback` since it's not used here

  useEffect(() => {
    if (!userLoading && user) {
      fetchClubAndEvents();
    }
  }, [userLoading, user, fetchClubAndEvents]);

  const handleEditEvent = (event) => {
    setEventToEdit(event);
    setIsModalOpen(true);
  };
  
  const handleCreateEvent = () => {
    setEventToEdit(null);
    setIsModalOpen(true);
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Are you sure you want to delete this event permanently?")) return;
    try {
      await ClubEvent.delete(eventId);
      alert("Event deleted successfully.");
      fetchClubAndEvents();
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert("Could not delete event. Please try again.");
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEventToEdit(null);
    fetchClubAndEvents();
  };

  if (loading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <RefreshCw className="w-12 h-12 animate-spin main-text" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#e5e4cd' }}>
        <Card className="tool-card-bg border-0 elegant-shadow text-center">
          <CardHeader><CardTitle className="main-text">Error</CardTitle></CardHeader>
          <CardContent>
            <p className="main-text opacity-70 mb-4">{error}</p>
            <Button asChild style={{ backgroundColor: '#f26222', color: 'white' }}>
              <Link to={createPageUrl('Clubs')}><ArrowLeft className="w-4 h-4 mr-2" />Back to Clubs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Only deny access if not loading, no error, and current user is not an admin
  if (!isCurrentUserAdmin && !loading && !userLoading && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4" style={{ backgroundColor: '#e5e4cd' }}>
        <div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="main-text mb-4">You must be an admin of this club to manage events.</p>
          <Button onClick={() => navigate(createPageUrl(`ClubDetails?id=${clubId}`))}>
            <ArrowLeft className="w-4 h-4 mr-2"/> Back to Club
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <CreateEventModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        clubId={clubId}
        clubName={club?.name}
        onEventCreated={handleModalClose}
        eventToEdit={eventToEdit}
      />
      
      {/* Admin Controls */}
      <div className="p-8" style={{ backgroundColor: '#e5e4cd' }}> {/* Wrap in div for background */}
        <div className="max-w-4xl mx-auto">
          <Card className="tool-card-bg border-0 elegant-shadow mb-8">
            <CardHeader>
              <CardTitle className="main-text flex items-center gap-3">
                <Shield className="w-6 h-6" />
                Admin Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button
                onClick={handleCreateEvent}
                style={{ backgroundColor: '#007e81', color: 'white' }}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create New Event
              </Button>
              <Button
                onClick={() => navigate(createPageUrl(`ClubDetails?id=${clubId}`))}
                style={{ backgroundColor: '#007e81', color: 'white' }}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Club Details
              </Button>
            </CardContent>
          </Card>

          <h1 className="text-4xl font-bold main-text mb-8">Manage Events for {club?.name}</h1>
          
          <div className="space-y-6">
            {events.length > 0 ? (
              events.map(event => (
                <Card key={event.id} className="tool-card-bg border-0 elegant-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold main-text">{event.title}</h3>
                        <p className="text-sm main-text opacity-70 mt-1">{event.description}</p>
                        <div className="mt-4 space-y-2 text-sm main-text opacity-90">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(event.start_time), 'EEE, MMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{format(new Date(event.start_time), 'p')} - {format(new Date(event.end_time), 'p')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{event.venue}</span>
                          </div>
                          {event.price > 0 && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              <span>${event.price}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${event.status === 'upcoming' ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-800'}`}>
                          {event.status}
                        </span>
                        <div className="flex gap-2 mt-2">
                           <Button size="sm" variant="outline" onClick={() => handleEditEvent(event)}>
                            <Edit className="w-3 h-3 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteEvent(event.id)}>
                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="tool-card-bg border-0 elegant-shadow text-center py-12">
                <CardContent>
                  <Calendar className="w-16 h-16 main-text opacity-50 mx-auto mb-4" />
                  <h3 className="text-xl font-bold main-text">No Events Created Yet</h3>
                  <p className="main-text opacity-70 mt-2">Create your first event to get started.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
