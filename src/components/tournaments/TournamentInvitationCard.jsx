import React, { useState } from 'react';
import { useUser } from '@/components/auth/UserProvider';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { joinTournament } from '@/functions/joinTournament';
import { declineTournamentInvitation } from '@/functions/declineTournamentInvitation';
import { Message } from '@/entities/Message';
import { TournamentParticipant } from '@/entities/TournamentParticipant';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function TournamentInvitationCard({ message, onAction }) {
    const { refetchUser } = useUser();
    const [isProcessing, setIsProcessing] = useState(false);
    const [tournamentId, setTournamentId] = useState(null);

    React.useEffect(() => {
        const getTournamentId = async () => {
            if (message && message.related_entity_id) {
                try {
                    // This is an optimistic fetch. It might fail if the record is gone.
                    const participantRecord = await TournamentParticipant.get(message.related_entity_id);
                    if (participantRecord) {
                        setTournamentId(participantRecord.tournament_id);
                    }
                } catch (e) {
                    // Record might be deleted, which is fine. The button link will just be disabled.
                    console.warn("Could not fetch participant record for invitation card.");
                }
            }
        };
        getTournamentId();
    }, [message]);

    const handleResponse = async (accept) => {
        if (!message.related_entity_id) {
            alert('Cannot respond: missing invitation data.');
            return;
        }

        setIsProcessing(true);
        try {
            const participantRecord = await TournamentParticipant.get(message.related_entity_id);
            if (!participantRecord) {
                alert('This invitation is no longer valid.');
                await Message.update(message.id, { status: 'read' });
                onAction();
                return;
            }

            const currentTournamentId = participantRecord.tournament_id;

            if (accept) {
                const { data } = await joinTournament({ tournament_id: currentTournamentId });
                if (!data.success) throw new Error(data.error || 'Failed to accept invitation.');
            } else {
                const { data } = await declineTournamentInvitation({ tournament_id: currentTournamentId });
                if (!data.success) throw new Error(data.error || 'Failed to decline invitation.');
            }
            
            // Mark the original message as read
            await Message.update(message.id, { status: 'read' });

        } catch (error) {
            console.error('Error responding to tournament invitation:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsProcessing(false);
            onAction(); // This will refetch messages on the parent page
            refetchUser(); // This will update bones balance if entry fee was paid
        }
    };

    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
            <p className="font-semibold text-bone-color" dangerouslySetInnerHTML={{ __html: message.body.replace(/\*\*(.*?)\*\*/g, '<strong class="highlight-text">$1</strong>') }} />
            <div className="flex gap-2">
                <Button
                    asChild
                    size="sm"
                    disabled={isProcessing || !tournamentId}
                    style={{ backgroundColor: '#9fd3ba', color: '#5a3217' }}
                    className="hover:opacity-90"
                    // The button now navigates to the tournament bracket page
                >
                    <Link to={tournamentId ? createPageUrl(`TournamentBracket?id=${tournamentId}`) : '#'}>
                        <Check className="w-4 h-4 mr-2" />
                        View & Accept
                    </Link>
                </Button>
                <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleResponse(false)}
                    disabled={isProcessing}
                >
                    <X className="w-4 h-4 mr-2" />
                    Decline
                </Button>
            </div>
        </div>
    );
}