import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Check, X, Trophy } from 'lucide-react';

export default function PendingInvitesList({ invites, leagueInvites = [], onAccept, onDecline, onAcceptLeague, onDeclineLeague }) {
  const totalInvites = invites.length + leagueInvites.length;

  return (
    <Card className="tool-card-bg border-0 elegant-shadow h-full">
      <CardHeader>
        <CardTitle className="main-text flex items-center gap-3">
          <Mail className="w-6 h-6" />
          Pending Invitations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalInvites > 0 ? (
          <div className="space-y-4">
            {/* Club Invites */}
            {invites.map((invite) => (
              <div 
                key={invite.id} 
                className="flex items-center justify-between p-4 rounded-lg bg-white/30"
              >
                <div>
                  <p className="font-bold main-text">{invite.club_name}</p>
                  <p className="text-sm main-text opacity-80">Club invitation</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    onClick={() => onAccept(invite.id)}
                    style={{ backgroundColor: '#007e81', color: 'white' }}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => onDecline(invite.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* League Invites */}
            {leagueInvites.map((invite) => (
              <div 
                key={invite.id} 
                className="flex items-center justify-between p-4 rounded-lg bg-white/30"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-bold main-text">{invite.league_name}</p>
                    <p className="text-sm main-text opacity-80">League invitation</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    onClick={() => onAcceptLeague(invite.id)}
                    style={{ backgroundColor: '#007e81', color: 'white' }}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => onDeclineLeague(invite.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 main-text opacity-70">
            <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>You have no pending invitations.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}