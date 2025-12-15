
import React, { useState, useEffect } from 'react';
import { useUser } from '../auth/UserProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ClubEvent } from '@/entities/ClubEvent';
import { ClubEventRSVP } from '@/entities/ClubEventRSVP';

export default function MyClubsList({ clubs = [] }) {
  const { user } = useUser();
  const [clubNotifications, setClubNotifications] = useState({});

  useEffect(() => {
    if (!user || !clubs || clubs.length === 0) {
      setClubNotifications({});
      return;
    }

    const fetchNotifications = async () => {
      try {
        const clubIds = clubs.map(c => c.club_id).filter(Boolean);
        if (clubIds.length === 0) return;

        // Get all upcoming events from user's clubs
        const allEvents = await ClubEvent.list();
        const upcomingEvents = allEvents.filter(event => 
          clubIds.includes(event.club_id) && 
          new Date(event.start_time) > new Date() && 
          event.status === 'upcoming'
        );

        if (upcomingEvents.length === 0) {
          setClubNotifications({});
          return;
        }

        // Get user's RSVPs
        const allRSVPs = await ClubEventRSVP.list();
        const userRSVPs = allRSVPs.filter(rsvp => rsvp.user_id === user.id);
        const respondedEventIds = new Set(userRSVPs.map(rsvp => rsvp.event_id));

        // Count pending responses per club
        const notifications = {};
        upcomingEvents.forEach(event => {
          if (!respondedEventIds.has(event.id)) {
            notifications[event.club_id] = (notifications[event.club_id] || 0) + 1;
          }
        });

        setClubNotifications(notifications);
      } catch (error) {
        console.error('Error fetching club notifications:', error);
        setClubNotifications({});
      }
    };

    fetchNotifications();
  }, [user, clubs]);

  if (!clubs || clubs.length === 0) {
    return (
      <Card className="tool-card-bg border-0 elegant-shadow h-full">
        <CardHeader>
          <CardTitle className="main-text flex items-center gap-3">
            <Users className="w-6 h-6" />
            My Clubs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 main-text opacity-70">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>You are not a member of any clubs yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="tool-card-bg border-0 elegant-shadow h-full">
      <CardHeader>
        <CardTitle className="main-text flex items-center gap-3">
          <Users className="w-6 h-6" />
          My Clubs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {clubs.map((membership) => (
            <div 
              key={membership.id} 
              className="flex items-center justify-between p-4 rounded-lg bg-white/30"
            >
              <div className="flex items-center gap-3">
                {membership.logo_url && (
                  <img
                    src={membership.logo_url}
                    alt={`${membership.club_name} logo`}
                    className="w-8 h-8 object-contain rounded bg-white"
                  />
                )}
                <div>
                  <p className="font-bold main-text">{membership.club_name || 'Unknown Club'}</p>
                  {clubNotifications[membership.club_id] > 0 && (
                    <span 
                      className="inline-block h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center mt-1"
                      style={{ backgroundColor: '#f26222', color: '#e5e4cd' }}
                    >
                      {clubNotifications[membership.club_id] > 9 ? '9+' : clubNotifications[membership.club_id]}
                    </span>
                  )}
                </div>
              </div>
              <Button 
                asChild
                size="sm"
                variant="outline"
              >
                <Link to={createPageUrl(`ClubDetails?id=${membership.club_id}`)}>
                  View <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
