import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Clock, 
    User as UserIcon, 
    Play, 
    Check, 
    X, 
    Trash2,
    CalendarCheck2,
    Hourglass,
    CheckCircle
} from 'lucide-react';
import { startScheduledMatch } from '@/functions/startScheduledMatch';
import { ScheduledMatch } from '@/entities/ScheduledMatch';
import { GameSession } from '@/entities/GameSession';

export default function ScheduledMatchCard({ match, user, onRefresh }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const isOrganizer = user.id === match.organizer_id;
    const isOpponent = user.id === match.opponent_id;
    const opponentUsername = isOrganizer ? match.opponent_username : match.organizer_username;

    const handleStartMatch = async () => {
        setLoading(true);
        setError(null);
        try {
            // First check if a game session already exists
            if (match.game_session_id) {
                const existingGame = await GameSession.get(match.game_session_id);
                if (existingGame) {
                    navigate(createPageUrl(`Game?id=${existingGame.id}`));
                    return;
                }
            }

            const response = await startScheduledMatch({ scheduled_match_id: match.id });
            const { gameSessionId } = response.data;
            if (gameSessionId) {
                navigate(createPageUrl(`Game?id=${gameSessionId}`));
            } else {
                throw new Error(response.data.error || "Failed to start match.");
            }
        } catch (err) {
            setError(err.message || 'An error occurred.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    const handleRespond = async (accepted) => {
        setLoading(true);
        setError(null);
        try {
            if (accepted) {
                await ScheduledMatch.update(match.id, { status: 'accepted' });
            } else {
                await ScheduledMatch.update(match.id, { status: 'declined' });
            }
            localStorage.setItem('scheduledMatchSuccess', JSON.stringify({
                message: accepted ? `Match with ${opponentUsername} accepted!` : `Match with ${opponentUsername} declined.`,
                timestamp: Date.now()
            }));
            onRefresh(true);
        } catch (err) {
            setError(err.message || 'Failed to respond.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleCancel = async () => {
        if (window.confirm('Are you sure you want to cancel this match?')) {
            setLoading(true);
            setError(null);
            try {
                await ScheduledMatch.update(match.id, { status: 'cancelled' });
                 localStorage.setItem('scheduledMatchSuccess', JSON.stringify({
                    message: `Match with ${opponentUsername} cancelled.`,
                    timestamp: Date.now()
                }));
                onRefresh(true);
            } catch (err) {
                setError(err.message || 'Failed to cancel.');
            } finally {
                setLoading(false);
            }
        }
    };

    const statusConfig = {
        pending: { text: "Pending Response", icon: Hourglass, color: "bg-yellow-500" },
        accepted: { text: "Accepted", icon: CalendarCheck2, color: "bg-green-500" },
        declined: { text: "Declined", icon: X, color: "bg-red-500" },
        cancelled: { text: "Cancelled", icon: Trash2, color: "bg-gray-500" },
        completed: { text: "Completed", icon: CheckCircle, color: "bg-blue-500" },
    };

    const currentStatus = statusConfig[match.status] || { text: match.status, icon: Hourglass, color: "bg-gray-500" };
    const StatusIcon = currentStatus.icon;

    // Convert UTC string to local Date object for formatting
    const localProposedDate = new Date(match.proposed_datetime);
    
    return (
        <Card className="bg-white/30 border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="main-text text-lg flex items-center gap-2">
                    <UserIcon className="w-5 h-5" />
                    vs {opponentUsername}
                </CardTitle>
                <Badge className={`${currentStatus.color} text-white`}>
                    <StatusIcon className="w-4 h-4 mr-2" />
                    {currentStatus.text}
                </Badge>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 main-text mb-2">
                            <Clock className="w-5 h-5" />
                            <div>
                                <p className="font-semibold">{format(localProposedDate, 'PPP')}</p>
                                <p className="text-sm">{format(localProposedDate, 'p')} (Your Local Time)</p>
                            </div>
                        </div>
                        <p className="main-text text-sm ml-7">{match.match_details}</p>
                        {match.bones_stake > 0 && <p className="main-text text-sm ml-7">🦴 {match.bones_stake} stake</p>}
                    </div>
                    
                    <div className="flex gap-2 self-end sm:self-center">
                        {match.status === 'pending' && isOpponent && (
                            <>
                                <Button onClick={() => handleRespond(true)} size="sm" style={{backgroundColor: '#007e81', color: 'white'}} disabled={loading}>
                                    <Check className="w-4 h-4 mr-2" /> Accept
                                </Button>
                                <Button onClick={() => handleRespond(false)} size="sm" variant="destructive" disabled={loading}>
                                    <X className="w-4 h-4 mr-2" /> Decline
                                </Button>
                            </>
                        )}

                        {match.status === 'accepted' && (match.organizer_id === user.id || match.opponent_id === user.id) && (
                            <Button onClick={handleStartMatch} size="sm" style={{backgroundColor: '#f26222', color: 'white'}} disabled={loading}>
                                <Play className="w-4 h-4 mr-2" /> Start Match
                            </Button>
                        )}

                        {match.status !== 'completed' && match.status !== 'cancelled' && isOrganizer && (
                            <Button onClick={handleCancel} size="sm" variant="ghost" className="text-red-600 hover:bg-red-100 hover:text-red-700" disabled={loading}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
                 {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
            </CardContent>
        </Card>
    );
}