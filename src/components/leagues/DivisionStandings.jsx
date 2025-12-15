import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from 'date-fns';
import { Calendar, Play, FilePen, Info } from 'lucide-react';

export default function DivisionStandings({
  league,
  division,
  participants,
  matches,
  onMatchUpdate,
  onArrangeMatch,
  onReportResult,
  onRespondToProposal,
}) {
  const standings = participants
    .map(p => {
      const playerMatches = matches.filter(m => (m.player_1_id === p.user_id || m.player_2_id === p.user_id) && m.status === 'completed');
      const wins = playerMatches.filter(m => m.winner_id === p.user_id).length;
      const draws = playerMatches.filter(m => !m.winner_id).length; // Assuming no winner means a draw
      const losses = playerMatches.length - wins - draws;
      const points = (wins * 3) + (draws * 1); // Standard league points
      
      const pointsFor = playerMatches.reduce((acc, m) => acc + (m.player_1_id === p.user_id ? (m.player_1_score || 0) : (m.player_2_score || 0)), 0);
      const pointsAgainst = playerMatches.reduce((acc, m) => acc + (m.player_1_id === p.user_id ? (m.player_2_score || 0) : (m.player_1_score || 0)), 0);

      return {
        ...p,
        matchesPlayed: playerMatches.length,
        wins,
        losses,
        draws,
        points,
        pointsFor,
        pointsAgainst,
        pointsDifference: pointsFor - pointsAgainst,
      };
    })
    .sort((a, b) => b.points - a.points || b.pointsDifference - a.pointsDifference || b.pointsFor - a.pointsFor);

  const getOpponent = (match, playerId) => {
    if (match.player_1_id === playerId) {
      return { id: match.player_2_id, username: match.player_2_username };
    }
    return { id: match.player_1_id, username: match.player_1_username };
  };

  const myMatches = matches
    .filter(m => m.status !== 'completed')
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  return (
    <Card className="tool-card-bg border-0 elegant-shadow mb-6">
      <CardHeader>
        <CardTitle className="main-text">{division.name}</CardTitle>
      </CardHeader>
      <CardContent>

        <Accordion type="single" collapsible className="w-full mb-6">
          <AccordionItem value="fixtures" className="border-b-0">
            <AccordionTrigger className="bg-white/10 px-4 py-2 rounded-md hover:no-underline hover:bg-white/20 main-text">
                Fixtures & Results
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <div className="space-y-4">
                {myMatches.length > 0 ? (
                  myMatches.map(match => {
                    const opponent = getOpponent(match, league.admin_user_id);
                    return (
                      <div key={match.id} className="p-4 bg-white/20 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-grow">
                          <p className="font-bold main-text text-lg">
                            {match.player_1_username} vs {match.player_2_username}
                          </p>
                          <p className="text-sm main-text opacity-70">
                            Status: <span className="font-semibold capitalize">{match.status.replace(/_/g, ' ')}</span>
                          </p>
                          {match.scheduled_date && (
                            <p className="text-sm main-text opacity-70 flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(match.scheduled_date), 'PPpp')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 self-start sm:self-center">
                          {match.status === 'unarranged' && (
                            <Button size="sm" onClick={() => onArrangeMatch(match)} style={{ backgroundColor: '#007e81', color: 'white' }} className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" /> Arrange
                            </Button>
                          )}
                          {match.status === 'arrangement_proposed' && (
                            <Button size="sm" onClick={() => onRespondToProposal(match)} style={{ backgroundColor: '#f26222', color: 'white' }} className="flex items-center gap-2">
                              <Info className="w-4 h-4" /> View Proposal
                            </Button>
                          )}
                          {match.status === 'scheduled' && league.match_play_type === 'online' && (
                            <Button size="sm" onClick={() => {}} style={{ backgroundColor: '#007e81', color: 'white' }} className="flex items-center gap-2">
                              <Play className="w-4 h-4" /> Play Match
                            </Button>
                          )}
                          {(match.status === 'scheduled' || match.status === 'pending_result_report') && (
                            <Button size="sm" onClick={() => onReportResult(match)} variant="outline" className="flex items-center gap-2">
                              <FilePen className="w-4 h-4" /> Report
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center py-4 main-text opacity-70">No pending fixtures.</p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        <h3 className="font-abolition text-2xl main-text mb-4">League Table</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] main-text">Pos</TableHead>
                <TableHead className="main-text">Player</TableHead>
                <TableHead className="text-center main-text">P</TableHead>
                <TableHead className="text-center main-text">W</TableHead>
                <TableHead className="text-center main-text">L</TableHead>
                <TableHead className="text-center main-text">D</TableHead>
                <TableHead className="text-center main-text">+/-</TableHead>
                <TableHead className="text-right main-text">Pts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((p, index) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium main-text">{index + 1}</TableCell>
                  <TableCell className="main-text">{p.username}</TableCell>
                  <TableCell className="text-center main-text">{p.matchesPlayed}</TableCell>
                  <TableCell className="text-center main-text">{p.wins}</TableCell>
                  <TableCell className="text-center main-text">{p.losses}</TableCell>
                  <TableCell className="text-center main-text">{p.draws}</TableCell>
                  <TableCell className="text-center main-text">{p.pointsDifference > 0 ? `+${p.pointsDifference}` : p.pointsDifference}</TableCell>
                  <TableCell className="text-right font-bold main-text">{p.points}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}