
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LeagueMatchProposal } from '@/entities/LeagueMatchProposal';
import { LeagueMatch } from '@/entities/LeagueMatch';
import { Message } from '@/entities/Message';
import { format } from 'date-fns';

export default function ProposalResponseModal({ isOpen, onClose, proposal, user, onAction }) {
  const [selectedTime, setSelectedTime] = useState(null);
  const [declineMessage, setDeclineMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  if (!proposal) return null;

  const handleAccept = async () => {
    if (!selectedTime) {
      alert('Please select a time to accept.');
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. Update the proposal status and accepted time
      await LeagueMatchProposal.update(proposal.id, {
        status: 'accepted',
        accepted_datetime: selectedTime,
      });

      // 2. Update the parent LeagueMatch
      await LeagueMatch.update(proposal.league_match_id, {
        status: 'scheduled',
        scheduled_date: selectedTime,
      });

      // 3. Send a notification to the proposer
      await Message.create({
        sender_id: 'system',
        sender_username: 'Bone Club Bot',
        recipient_id: proposal.proposer_id,
        recipient_username: proposal.proposer_username,
        type: 'notification',
        subject: `Match Accepted: ${user.username} vs ${proposal.proposer_username}`,
        body: `Great news! ${user.username} has accepted your proposed match time. The match is now scheduled for ${format(new Date(selectedTime), 'PPP p')}. You can start the match from your My Games page when the time comes.`,
        related_entity_id: proposal.league_match_id,
        related_entity_type: 'LeagueMatch',
      });

      // 4. Show success notification to acceptor
      if (onAction) {
        onAction(`You have accepted the match with ${proposal.proposer_username}. The match is scheduled for ${format(new Date(selectedTime), 'PPP p')}.`);
      }

      onClose();
    } catch (error) {
      console.error("Failed to accept proposal:", error);
      alert('There was an error accepting the proposal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setIsSubmitting(true);
    try {
      await LeagueMatchProposal.update(proposal.id, {
        status: 'declined',
      });
      
      // Reset match status back to unarranged
      await LeagueMatch.update(proposal.league_match_id, {
        status: 'unarranged'
      });
      
      await Message.create({
        sender_id: 'system',
        sender_username: 'Bone Club Bot',
        recipient_id: proposal.proposer_id,
        recipient_username: proposal.proposer_username,
        type: 'notification',
        subject: `Match Declined: ${user.username} vs ${proposal.proposer_username}`,
        body: `${user.username} has declined your proposed match times.${declineMessage ? ` They said: "${declineMessage}"` : ''} You can propose new times from your My Games page.`,
        related_entity_id: proposal.league_match_id,
        related_entity_type: 'LeagueMatch',
      });

      // Show feedback to decliner
      if (onAction) {
        onAction(`You have declined the match proposal from ${proposal.proposer_username}.`);
      }

      onClose();
    } catch (error) {
      console.error("Failed to decline proposal:", error);
      alert('There was an error declining the proposal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRecipient = user?.id === proposal.recipient_id;
  const opponentUsername = isRecipient ? proposal.proposer_username : proposal.recipient_username;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#e5e4cd' }}>
        <DialogHeader>
          <DialogTitle className="main-text">Respond to Proposal</DialogTitle>
          <DialogDescription className="main-text opacity-80">
            From: <span className="font-bold">{opponentUsername}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="main-text font-semibold">Proposed Times:</p>
          <RadioGroup onValueChange={setSelectedTime}>
            {proposal.proposed_datetimes.map((dt) => (
              <div key={dt} className="flex items-center space-x-2">
                <RadioGroupItem value={dt} id={dt} />
                <Label htmlFor={dt} className="main-text">
                  {format(new Date(dt), 'eeee, MMM d, yyyy @ p')}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {proposal.custom_message && (
            <blockquote className="mt-2 p-3 bg-black/5 rounded-md text-sm main-text italic border-l-2 border-[#5a3217]/50">
               <span className='font-bold not-italic'>{opponentUsername} says:</span> "{proposal.custom_message}"
            </blockquote>
        )}

        <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="decline-message" className="main-text">Decline with a message (optional)</Label>
            <Textarea
                id="decline-message"
                placeholder="Can't make these times, how about next week?"
                value={declineMessage}
                onChange={(e) => setDeclineMessage(e.target.value)}
                className="bg-white"
            />
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDecline}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Decline All'}
          </Button>
          <Button
            type="button"
            onClick={handleAccept}
            disabled={!selectedTime || isSubmitting}
            style={{ backgroundColor: '#007e81', color: 'white' }}
          >
            {isSubmitting ? 'Accepting...' : 'Accept Selected Time'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
