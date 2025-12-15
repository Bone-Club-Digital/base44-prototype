import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, Send } from 'lucide-react';
import { LeagueMatchProposal } from '@/entities/LeagueMatchProposal';

export default function ArrangeLeagueMatchModal({ isOpen, onClose, match, user, onProposalSent }) {
  const [proposedDatetimes, setProposedDatetimes] = useState(['']);
  const [customMessage, setCustomMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Reset form when modal opens for a new match
    if (isOpen) {
      setProposedDatetimes(['']);
      setCustomMessage('');
      setIsSubmitting(false);
      setError('');
    }
  }, [isOpen]);

  const handleTimeChange = (index, value) => {
    const newTimes = [...proposedDatetimes];
    newTimes[index] = value;
    setProposedDatetimes(newTimes);
  };

  const addTimeSlot = () => {
    if (proposedDatetimes.length < 5) {
      setProposedDatetimes([...proposedDatetimes, '']);
    }
  };

  const removeTimeSlot = (index) => {
    if (proposedDatetimes.length > 1) {
      const newTimes = proposedDatetimes.filter((_, i) => i !== index);
      setProposedDatetimes(newTimes);
    }
  };

  const handleSubmit = async () => {
    const validTimes = proposedDatetimes.filter(time => time.trim() !== '');
    if (validTimes.length === 0) {
      setError('Please propose at least one time slot.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      const recipient = user.id === match.player_1_id 
        ? { id: match.player_2_id, username: match.player_2_username }
        : { id: match.player_1_id, username: match.player_1_username };

      await LeagueMatchProposal.create({
        league_match_id: match.id,
        proposer_id: user.id,
        proposer_username: user.username,
        recipient_id: recipient.id,
        recipient_username: recipient.username,
        proposed_datetimes: validTimes.map(time => new Date(time).toISOString()), // Convert to UTC
        custom_message: customMessage,
        status: 'pending',
      });
      
      onProposalSent();
      onClose();

    } catch (err) {
      console.error('Failed to send proposal:', err);
      setError('Failed to send proposal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!match) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px] text-white" style={{ backgroundColor: '#5a3217' }}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-white uppercase">Arrange League Match</DialogTitle>
          <DialogDescription className="text-bone-color-faded">
            Propose some times to play your match against {user.id === match.player_1_id ? match.player_2_username : match.player_1_username}. Times should be in your local timezone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="datetime-1" className="text-bone-color">Proposed Times (at least 1)</Label>
            {proposedDatetimes.map((time, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  id={`datetime-${index + 1}`}
                  type="datetime-local"
                  value={time}
                  onChange={(e) => handleTimeChange(index, e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  disabled={isSubmitting}
                />
                {proposedDatetimes.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeTimeSlot(index)} disabled={isSubmitting} className="text-red-400 hover:text-red-300 hover:bg-white/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {proposedDatetimes.length < 5 && (
              <Button variant="outline" size="sm" onClick={addTimeSlot} disabled={isSubmitting} className="text-bone-color border-bone-color hover:bg-white/10">
                <PlusCircle className="w-4 h-4 mr-2" /> Add Time Slot
              </Button>
            )}
          </div>
          <div>
            <Label htmlFor="custom-message" className="text-bone-color">Message (Optional)</Label>
            <Textarea
              id="custom-message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="e.g., 'Let me know if any of these work for you!'"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              rows={2}
              disabled={isSubmitting}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="text-bone-color border-bone-color hover:bg-white/10">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} style={{ backgroundColor: '#f26222', color: 'white' }}>
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Sending...' : 'Send Proposal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}