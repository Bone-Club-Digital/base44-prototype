import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Calendar, MessageSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function LeagueProposalCard({ proposal, user, onRespond }) {
    const isProposer = user.id === proposal.proposer_id;
    const otherPlayerUsername = isProposer ? proposal.recipient_username : proposal.proposer_username;
    
    return (
        <Card className="bg-white/30 border-0">
            <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-grow">
                        <div className="flex items-center gap-2 main-text mb-2">
                            <User className="w-5 h-5" />
                            <p className="font-semibold">
                                {isProposer ? 'You proposed to' : 'Proposal from'} {otherPlayerUsername}
                            </p>
                        </div>
                        <div className="flex items-start gap-2 main-text mb-2 pl-7">
                            <Calendar className="w-5 h-5 flex-shrink-0 mt-1" />
                            <div>
                                <p className="font-semibold">Proposed Times (Your Local Time):</p>
                                <ul className="list-disc list-inside text-sm">
                                    {proposal.proposed_datetimes.map((dt, index) => (
                                        <li key={index}>
                                            {format(new Date(dt), 'eee, MMM d @ p')}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        {proposal.custom_message && (
                            <div className="flex items-start gap-2 main-text pl-7">
                                <MessageSquare className="w-5 h-5 flex-shrink-0 mt-1" />
                                <p className="text-sm italic bg-black/10 p-2 rounded-md">"{proposal.custom_message}"</p>
                            </div>
                        )}
                    </div>
                    <div className="flex-shrink-0 self-end sm:self-center">
                        {!isProposer && (
                             <Button onClick={onRespond} style={{backgroundColor: '#007e81', color: 'white'}}>
                                <Clock className="w-4 h-4 mr-2" /> Respond
                            </Button>
                        )}
                         {isProposer && (
                            <div className="flex items-center gap-2 text-sm main-text p-2 rounded-md bg-black/10">
                                <Clock className="w-4 h-4"/>
                                <span>Awaiting Response</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}