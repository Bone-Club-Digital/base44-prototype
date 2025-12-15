
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Trophy, X } from 'lucide-react';
import { League } from '@/entities/League';
import { LeagueParticipant } from '@/entities/LeagueParticipant';
import { Message } from '@/entities/Message';
import { Club } from '@/entities/Club';
import { format } from 'date-fns';

export default function LeagueInvitationCard({ message, onAction, onSuccess }) {
    const [league, setLeague] = useState(null);
    const [club, setClub] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            setError(null);
            setLeague(null);
            
            if (!message || !message.related_entity_id) {
                setLoading(false);
                return;
            }
            try {
                const participant = await LeagueParticipant.get(message.related_entity_id);
                if (participant && participant.league_id) {
                    const [leagueData, clubData] = await Promise.all([
                        League.get(participant.league_id),
                        participant.club_id ? Club.get(participant.club_id) : Promise.resolve(null)
                    ]);
                    setLeague(leagueData);
                    setClub(clubData);
                } else {
                    setError("Invitation is missing details.");
                }
            } catch (err) {
                if (err.response && err.response.status === 404) {
                    console.warn(`Required entity not found for invitation message ${message.id}. It was likely declined or the league was deleted. Attempting to hide message.`);
                    setError("Invitation not found.");
                    try {
                        await Message.update(message.id, { status: 'read' });
                        if (onAction) onAction();
                    } catch (cleanupError) {
                        console.warn('Failed to cleanup stale message:', cleanupError);
                    }
                } else {
                    console.error("Failed to fetch invitation details:", err);
                    setError("Could not load invitation details.");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [message, onAction]);

    const handleInvitation = async (accepted) => {
        try {
            if (accepted) {
                await LeagueParticipant.update(message.related_entity_id, { status: 'active' });
                if (onSuccess && league) {
                    onSuccess(`You have successfully joined the "${league.name}" league.`, league.id);
                }
            } else {
                await LeagueParticipant.delete(message.related_entity_id);
            }
            await Message.update(message.id, { status: 'read' });
            if (onAction) onAction();
        } catch (error) {
            console.error("Error responding to league invitation:", error);
            alert("Failed to respond to invitation.");
        }
    };

    if (loading) {
        return (
             <Card className="tool-card-bg border-0 elegant-shadow mb-6" style={{ backgroundColor: '#007e81' }}>
                <CardContent className="p-4 text-bone-color">
                    Loading invitation...
                </CardContent>
            </Card>
        );
    }
    
    if (error || !league) {
        // Silently fail and don't render the card if the invitation data is missing or cancelled.
        return null; 
    }
    
    const registrationCloses = league.registration_end_date 
        ? `Registration closes ${format(new Date(league.registration_end_date), 'PPP')}`
        : 'Registration open';

    return (
        <Card className="tool-card-bg border-0 elegant-shadow mb-6" style={{ backgroundColor: '#007e81' }}>
            <CardHeader className="pt-4 pb-2">
                <CardTitle className="text-bone-color flex items-center gap-3 text-lg">
                    <Trophy className="w-5 h-5" />
                    League Invitation
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg bg-black/20 gap-4">
                    <div className="flex-grow">
                        <p className="font-semibold text-bone-color">
                            <strong className="highlight-text">{club?.name || message.club_name}</strong> invites you to join the <strong className="highlight-text">{league.name}</strong> league.
                        </p>
                        <p className="text-sm text-bone-color-faded mt-1">{registrationCloses}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 self-end sm:self-center">
                        <Button
                            size="sm"
                            onClick={() => handleInvitation(true)}
                            style={{ backgroundColor: '#9fd3ba', color: '#5a3217' }}
                            className="hover:opacity-90"
                        >
                            <Check className="w-4 h-4 md:mr-2" />
                            <span className="hidden md:inline">Accept</span>
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleInvitation(false)}
                        >
                            <X className="w-4 h-4 md:mr-2" />
                            <span className="hidden md:inline">Decline</span>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
