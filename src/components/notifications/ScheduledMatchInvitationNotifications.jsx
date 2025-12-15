import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, Mail } from 'lucide-react';
import { ScheduledMatch } from '@/entities/ScheduledMatch';
import { format } from 'date-fns';

export default function ScheduledMatchInvitationNotifications({ invites, onAction, currentPage }) {
    const handleInvitation = async (matchId, accepted) => {
        try {
            await ScheduledMatch.update(matchId, { status: accepted ? 'accepted' : 'declined' });
            if (onAction) onAction();
        } catch (error) {
            console.error(`Error ${accepted ? 'accepting' : 'declining'} match:`, error);
            alert(`Failed to ${accepted ? 'accept' : 'decline'} match.`);
        }
    };
    
    if (!invites || invites.length === 0) {
        return null;
    }

    return (
        <Card className="tool-card-bg border-0 elegant-shadow mb-6" style={{ backgroundColor: '#007e81' }}>
            <CardHeader>
                <CardTitle className="text-bone-color flex items-center gap-3">
                    <Mail className="w-6 h-6" />
                    You Have Pending Match Invitations
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {invites.map(invite => {
                    if (!invite.scheduledMatch) return null; // Defensive check
                    const localProposedDate = new Date(invite.scheduledMatch.proposed_datetime);
                    return (
                        <div key={invite.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg bg-black/20 gap-4">
                             <div className="flex-grow">
                                <p className="font-semibold text-bone-color">
                                    <strong className="highlight-text">{invite.sender_username}</strong> challenged you to a match.
                                </p>
                                <p className="text-sm text-bone-color-faded mt-1">
                                    Time: {format(localProposedDate, 'PPP p')} (Your Local Time)
                                </p>
                            </div>
                            <div className="flex gap-2 flex-shrink-0 self-end sm:self-center">
                                <Button
                                    size="sm"
                                    onClick={() => handleInvitation(invite.related_entity_id, true)}
                                    style={{ backgroundColor: '#9fd3ba', color: '#5a3217' }}
                                    className="hover:opacity-90"
                                >
                                    <Check className="w-4 h-4 md:mr-2" />
                                    <span className="hidden md:inline">Accept</span>
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleInvitation(invite.related_entity_id, false)}
                                >
                                    <X className="w-4 h-4 md:mr-2" />
                                    <span className="hidden md:inline">Decline</span>
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}