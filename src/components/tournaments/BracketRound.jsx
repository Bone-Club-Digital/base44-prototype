import React from 'react';
import BracketMatch from './BracketMatch';

export default function BracketRound({ roundNumber, matches, currentUserId, onUpdate }) {
    return (
        <div className="flex flex-col items-center space-y-8">
            <h3 className="text-xl main-text font-bold uppercase tracking-wider">
                Round {roundNumber}
            </h3>
            <div className="space-y-4">
                {matches.map(match => (
                    <BracketMatch 
                        key={match.id} 
                        match={match} 
                        currentUserId={currentUserId}
                        onUpdate={onUpdate}
                    />
                ))}
            </div>
        </div>
    );
}