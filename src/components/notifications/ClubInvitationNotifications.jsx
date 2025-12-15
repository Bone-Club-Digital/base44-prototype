import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, Users } from 'lucide-react';
import { ClubMember } from '@/entities/ClubMember';
import { Message } from '@/entities/Message';

export default function ClubInvitationNotifications({ invites, onAction }) {
    const handleInvitation = async (messageId, clubMemberId, accepted, clubName, clubId) => {
        try {
            if (accepted) {
                await ClubMember.update(clubMemberId, { status: 'active' });
            } else {
                await ClubMember.delete(clubMemberId);
            }
            await Message.update(messageId, { status: 'read' });
            
            if (onAction) {
                onAction(accepted, clubName, accepted ? clubId : null);
            }
        } catch (error) {
            console.error(`Error ${accepted ? 'accepting' : 'declining'} club invitation:`, error);
            alert(`Failed to ${accepted ? 'accept' : 'decline'} club invitation.`);
        }
    };
    
    if (!invites || invites.length === 0) {
        return null;
    }

    return (
        <Card className="tool-card-bg border-0 elegant-shadow mb-6" style={{ backgroundColor: '#007e81' }}>
            <CardHeader>
                <CardTitle className="text-bone-color flex items-center gap-3">
                    <Users className="w-6 h-6" />
                    You Have Pending Club Invitations
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {invites.map(invite => (
                    <div key={invite.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg bg-black/20 gap-4">
                        <div className="flex-grow">
                            <p className="font-semibold text-bone-color">
                                You've been invited to join <strong className="highlight-text">{invite.club_name}</strong>
                            </p>
                            <p className="text-sm text-bone-color-faded mt-1">
                                From: {invite.sender_username}
                            </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0 self-end sm:self-center">
                            <Button
                                size="sm"
                                onClick={() => handleInvitation(invite.id, invite.related_entity_id, true, invite.club_name, invite.club_id)}
                                style={{ backgroundColor: '#9fd3ba', color: '#5a3217' }}
                                className="hover:opacity-90"
                            >
                                <Check className="w-4 h-4 md:mr-2" />
                                <span className="hidden md:inline">Accept</span>
                            </Button>
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleInvitation(invite.id, invite.related_entity_id, false, invite.club_name, invite.club_id)}
                            >
                                <X className="w-4 h-4 md:mr-2" />
                                <span className="hidden md:inline">Decline</span>
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}