
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import { LeagueMatch } from '@/entities/LeagueMatch';

export default function ReportResultModal({ isOpen, onClose, match, user, onResultReported }) {
  const [player1Score, setPlayer1Score] = useState('');
  const [player2Score, setPlayer2Score] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!match) return null;

  const opponent = user.id === match.player_1_id ? 
    { id: match.player_2_id, username: match.player_2_username } : 
    { id: match.player_1_id, username: match.player_1_username };
  
  const legText = match.leg === 1 ? ' (first match)' : match.leg === 2 ? ' (second match)' : '';

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async () => {
    if (!player1Score || !player2Score) {
      alert("Please enter scores for both players.");
      return;
    }
    
    const p1Score = parseInt(player1Score, 10);
    const p2Score = parseInt(player2Score, 10);

    if (isNaN(p1Score) || isNaN(p2Score)) {
        alert("Please enter valid numbers for scores.");
        return;
    }

    setIsSubmitting(true);
    try {
      await LeagueMatch.update(match.id, {
          player_1_score: p1Score,
          player_2_score: p2Score,
          status: 'completed',
          winner_id: p1Score > p2Score ? match.player_1_id : match.player_2_id,
          reported_by_user_id: user.id,
      });

      if (onResultReported) {
        onResultReported();
      }
      onClose();
    } catch (error) {
      console.error("Error reporting result:", error);
      alert("Failed to report result. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg" style={{ backgroundColor: '#e5e4cd' }}>
        <DialogHeader>
          <DialogTitle className="main-text">Report Result: You vs {opponent.username}{legText}</DialogTitle>
          <DialogDescription className="main-text opacity-80">
            Enter the final scores for the match. This will be sent to your opponent for confirmation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="player1-score" className="text-bone-color">{match.player_1_username}</Label>
            <Input
              id="player1-score"
              type="number"
              value={player1Score}
              onChange={(e) => setPlayer1Score(e.target.value)}
              className="bg-white/10 border-white/20 text-white"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="player2-score" className="text-bone-color">{match.player_2_username}</Label>
            <Input
              id="player2-score"
              type="number"
              value={player2Score}
              onChange={(e) => setPlayer2Score(e.target.value)}
              className="bg-white/10 border-white/20 text-white"
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} style={{ backgroundColor: '#f26222', color: 'white' }}>
            {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : 'Submit Result'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
