
import React from 'react';
import BracketRound from './BracketRound';

export default function Bracket({ matches, currentUserId, onUpdate }) {
  if (!matches || matches.length === 0) {
    // Empty state message, as implied by the outline
    return <div className="text-center text-gray-500 py-8">No matches found for this tournament.</div>;
  }

  // Group matches by round and sort them by match_number_in_round
  const rounds = matches.reduce((acc, match) => {
    (acc[match.round] = acc[match.round] || []).push(match);
    return acc;
  }, {});

  Object.values(rounds).forEach(round => {
    round.sort((a, b) => a.match_number_in_round - b.match_number_in_round);
  });

  // Sort rounds numerically by their round number key
  const sortedRoundEntries = Object.entries(rounds).sort(([roundA], [roundB]) => parseInt(roundA) - parseInt(roundB));

  return (
    // The main container for the bracket, updated to new flex layout
    <div className="flex gap-8 items-start">
      {sortedRoundEntries.map(([roundNumber, roundMatches]) => (
        <BracketRound
          key={roundNumber}
          roundNumber={roundNumber}
          matches={roundMatches}
          currentUserId={currentUserId}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}
