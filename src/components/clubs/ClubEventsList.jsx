
import React, { useState, useEffect } from 'react';
import { useUser } from '../auth/UserProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Check, X, HelpCircle } from 'lucide-react';
import { ClubEventRSVP } from '@/entities/ClubEventRSVP';
import { format } from 'date-fns';

export default function ClubEventsList({ clubId, events, rsvps }) {
  const { user } = useUser();
  const [userRSVPs, setUserRSVPs] = useState({});
  const [sortedEvents, setSortedEvents] = useState([]);

  useEffect(() => {
    // Sort events whenever the events prop changes
    if (events) {
      const now = new Date();
      const upcomingEvents = events
        .filter(event => new Date(event.start_time) >= now)
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      
      const pastEvents = events
        .filter(event => new Date(event.start_time) < now)
        .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
      
      setSortedEvents([...upcomingEvents, ...pastEvents]);
    }

    // Map user's RSVPs
    if (user && rsvps) {
      const userRSVPMap = {};
      rsvps
        .filter(rsvp => rsvp.user_id === user.id)
        .forEach(rsvp => {
          userRSVPMap[rsvp.event_id] = rsvp.response;
        });
      setUserRSVPs(userRSVPMap);
    }
  }, [events, rsvps, user]);

  const handleRSVP = async (eventId, response) => {
    if (!user) return;

    try {
      // Check if user already has an RSVP for this event
      const existingRSVPs = await ClubEventRSVP.filter({ event_id: eventId, user_id: user.id });
      const event = sortedEvents.find(e => e.id === eventId);

      if (existingRSVPs.length > 0) {
        // Update existing RSVP
        await ClubEventRSVP.update(existingRSVPs[0].id, { response });
      } else {
        // Create new RSVP
        await ClubEventRSVP.create({
          event_id: eventId,
          club_id: clubId,
          user_id: user.id,
          username: user.username || user.full_name,
          response,
          event_title: event?.title || 'Event'
        });
      }

      // Update local state
      setUserRSVPs(prev => ({ ...prev, [eventId]: response }));
    } catch (error) {
      console.error('Error updating RSVP:', error);
      alert('Failed to update RSVP. Please try again.');
    }
  };

  const getResponseIcon = (response) => {
    switch (response) {
      case 'going': return <Check className="w-4 h-4 text-green-600" />;
      case 'maybe': return <HelpCircle className="w-4 h-4 text-yellow-600" />;
      case 'cant_make_it': return <X className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const getResponseColor = (response) => {
    switch (response) {
      case 'going': return 'bg-green-100 text-green-800';
      case 'maybe': return 'bg-yellow-100 text-yellow-800';
      case 'cant_make_it': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!events) {
    return (
      <Card className="tool-card-bg border-0 elegant-shadow h-fit">
        <CardHeader>
          <CardTitle className="main-text flex items-center gap-3">
            <Calendar className="w-6 h-6" />
            Events
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="w-6 h-6 border-2 border-[#5a3217] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="main-text opacity-70">Loading events...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="tool-card-bg border-0 elegant-shadow h-fit">
      <CardHeader>
        <CardTitle className="main-text flex items-center gap-3">
          <Calendar className="w-6 h-6" />
          Events ({sortedEvents.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedEvents.length > 0 ? (
          <div className="space-y-4">
            {sortedEvents.map(event => {
              const userResponse = userRSVPs[event.id];
              const eventDate = new Date(event.start_time);
              const isUpcoming = eventDate > new Date();

              // Correctly determine the event status for display
              let statusText;
              let statusVariant;
              if (event.status === 'cancelled') {
                statusText = 'Cancelled';
                statusVariant = 'secondary';
              } else if (event.status === 'completed') {
                statusText = 'Completed';
                statusVariant = 'secondary';
              } else if (isUpcoming) {
                statusText = 'Upcoming';
                statusVariant = 'default';
              } else {
                statusText = 'Past';
                statusVariant = 'secondary';
              }
              
              return (
                <div key={event.id} className="p-4 rounded-lg bg-white/30">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold main-text">{event.title}</h4>
                      <p className="text-sm main-text opacity-70">{event.description}</p>
                    </div>
                    <Badge variant={statusVariant}>
                      {statusText}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm main-text opacity-80 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{format(eventDate, 'PPP p')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{event.venue}</span>
                    </div>
                    {event.price > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="font-bold">Price: ${event.price}</span>
                      </div>
                    )}
                  </div>

                  {user && isUpcoming && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm main-text opacity-70 mr-2">RSVP:</span>
                      {['going', 'maybe', 'cant_make_it'].map(response => (
                        <Button
                          key={response}
                          size="sm"
                          variant={userResponse === response ? 'default' : 'outline'}
                          onClick={() => handleRSVP(event.id, response)}
                          className={`flex items-center gap-1 ${
                            userResponse === response ? getResponseColor(response) : ''
                          }`}
                        >
                          {getResponseIcon(response)}
                          <span className="capitalize">
                            {response === 'cant_make_it' ? "Can't make it" : response}
                          </span>
                        </Button>
                      ))}
                    </div>
                  )}

                  {userResponse && (
                    <div className="mt-2">
                      <Badge className={getResponseColor(userResponse)}>
                        Your response: {userResponse === 'cant_make_it' ? "Can't make it" : userResponse}
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 main-text opacity-70">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No events scheduled yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
