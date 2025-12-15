import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Gamepad2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function LeagueProposalNotificationCard({ proposals }) {
    const navigate = useNavigate();

    const handleViewProposals = () => {
        navigate(createPageUrl('MyGames'));
    };

    if (!proposals || proposals.length === 0) {
        return null;
    }

    const proposalCount = proposals.length;

    return (
        <Card className="tool-card-bg border-0 elegant-shadow mb-6" style={{ backgroundColor: '#007e81' }}>
            <CardHeader>
                <CardTitle className="text-bone-color flex items-center gap-3">
                    <Calendar className="w-6 h-6" />
                    New League Match Proposal{proposalCount > 1 ? 's' : ''}
                </CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                    <p className="font-semibold text-bone-color">
                        You have {proposalCount} new league match proposal{proposalCount > 1 ? 's' : ''} to review.
                    </p>
                    <Button
                        size="sm"
                        onClick={handleViewProposals}
                        style={{ backgroundColor: '#9fd3ba', color: '#5a3217' }}
                        className="hover:opacity-90"
                    >
                        <Gamepad2 className="w-4 h-4 mr-2" />
                        View in My Games
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}