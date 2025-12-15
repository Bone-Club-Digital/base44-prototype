
import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Tournament } from '@/entities/Tournament';
import { TournamentParticipant } from '@/entities/TournamentParticipant';
import { Message } from '@/entities/Message';
import { useUser } from '../auth/UserProvider';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import { Switch } from '@/components/ui/switch'; // Import the Switch component

export default function CreateTournamentModal({ isOpen, onClose, onSubmit, club, clubMembers }) {
  const { user } = useUser();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('knockout');
  const [entryFee, setEntryFee] = useState("0");
  const [targetScore, setTargetScore] = useState("3");
  const [isSending, setIsSending] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [startTime, setStartTime] = useState('19:00'); // Default to 7 PM
  const [locationType, setLocationType] = useState('online');
  const [roundTimeLimit, setRoundTimeLimit] = useState('48');
  const [maxCompetitors, setMaxCompetitors] = useState('');
  const [isRated, setIsRated] = useState(true); // New state for rated tournament toggle

  // Generate URL slug from tournament name
  const generateUrlSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-'); // Remove leading/trailing hyphens
  };

  const previewUrl = name ? `https://base44.com/boneclub/${generateUrlSlug(name)}` : '';

  const handleCreate = async () => {
    if (!name.trim() || !club) {
      alert("Tournament name is required and club data must be present.");
      return;
    }
    
    setIsSending(true);

    try {
      const tournamentUrl = generateUrlSlug(name);
      
      // Combine date and time if both are provided
      let combinedStartDateTime = null;
      if (startDate && startTime) {
        const [hours, minutes] = startTime.split(':');
        combinedStartDateTime = new Date(startDate);
        combinedStartDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      
      const newTournament = await Tournament.create({
        name,
        description,
        type,
        club_id: club.id,
        club_name: club.name,
        admin_user_id: user.id,
        admin_username: user.username,
        status: 'registration_open',
        entry_fee_bones: parseInt(entryFee),
        match_settings: {
          targetScore: parseInt(targetScore),
          use_clock: false,
          is_rated: isRated, // Include is_rated in match settings
        },
        start_date: combinedStartDateTime ? combinedStartDateTime.toISOString() : null,
        location_type: locationType,
        round_time_limit_hours: Number(roundTimeLimit), // Changed to Number to support decimal values
        tournament_url: tournamentUrl,
        max_competitors: maxCompetitors ? parseInt(maxCompetitors) : null,
      });
      
      const clubDetailsUrl = `${window.location.origin}${createPageUrl(`ClubDetails?id=${club.id}`)}`;

      // Only create participants and messages if we have club members
      if (clubMembers && clubMembers.length > 0) {
        const participantPromises = clubMembers.map(member => 
          TournamentParticipant.create({
            tournament_id: newTournament.id,
            user_id: member.user_id,
            username: member.username,
            status: 'invited',
          })
        );
        
        const messagePromises = clubMembers.map(member => 
          Message.create({
            sender_id: 'system',
            sender_username: 'Bone Club System',
            recipient_id: member.user_id,
            type: 'notification',
            subject: `New Tournament in ${club.name}: ${name}`,
            body: `You have been invited to join the **${club.name}** tournament **"${name}"**. You can accept or decline this invitation from [**The ${club.name} page**](${clubDetailsUrl}).`,
            related_entity_id: newTournament.id,
            related_entity_type: 'tournament_invitation'
          })
        );

        await Promise.all([...participantPromises, ...messagePromises]);
      }

      if (onSubmit) {
        onSubmit(newTournament);
      }
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error creating tournament:", error);
      alert("Failed to create tournament.");
    } finally {
      setIsSending(false);
    }
  };
  
  const resetForm = () => {
      setName('');
      setDescription('');
      setType('knockout');
      setEntryFee("0");
      setTargetScore("3");
      setStartDate(null);
      setStartTime('19:00');
      setLocationType('online');
      setRoundTimeLimit('48');
      setMaxCompetitors('');
      setIsRated(true); // Reset isRated state
  };

  const handleClose = () => {
      resetForm();
      onClose();
  };

  if (!club) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] text-white max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#5a3217' }}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-white uppercase">Create Tournament</DialogTitle>
          <DialogDescription className="text-bone-color-faded">
            Set up your tournament settings and invite all club members to participate.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="tournament-name" className="text-bone-color">Tournament Name</Label>
            <Input
              id="tournament-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter tournament name"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              disabled={isSending}
            />
            {previewUrl && (
              <p className="text-xs text-bone-color-faded mt-1">
                URL: {previewUrl}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="tournament-description" className="text-bone-color">Description (Optional)</Label>
            <Textarea
              id="tournament-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your tournament..."
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              disabled={isSending}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-bone-color">Tournament Type</Label>
              <Select value={type} onValueChange={setType} disabled={isSending}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="knockout">Knockout</SelectItem>
                  <SelectItem value="double_elimination">Double Elimination</SelectItem>
                  <SelectItem value="swiss">Swiss System</SelectItem>
                  <SelectItem value="round_robin">Round Robin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-bone-color">Location Type</Label>
              <Select value={locationType} onValueChange={setLocationType} disabled={isSending}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="in_person">In Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-bone-color">Start Date (Optional)</Label>
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left bg-white/10 border-white/20 text-white hover:bg-white/20"
                    disabled={isSending}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-bone-color">Start Time (Optional)</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
                disabled={isSending || !startDate}
              />
            </div>
          </div>

          {/* Match Settings Section */}
          <div className="space-y-4">
            <h4 className="font-medium text-bone-color">Match Settings</h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-bone-color">Entry Fee (Bones)</Label>
                <Input
                  type="number"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                  placeholder="0"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  disabled={isSending}
                  min="0"
                />
              </div>

              <div>
                <Label className="text-bone-color">Match Length</Label>
                <Select value={targetScore} onValueChange={setTargetScore} disabled={isSending}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 3, 5, 7, 9, 11, 13, 15].map(score => (
                      <SelectItem key={score} value={String(score)}>{score} points</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-bone-color">Max Players</Label>
                <Input
                  type="number"
                  value={maxCompetitors}
                  onChange={(e) => setMaxCompetitors(e.target.value)}
                  placeholder="No limit"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  disabled={isSending}
                  min="2"
                />
              </div>
            </div>
            
            {/* NEW: Rated Tournament Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="is-rated" className="text-bone-color">
                Rated Tournament
              </Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="is-rated"
                  checked={isRated}
                  onCheckedChange={setIsRated}
                  disabled={isSending}
                />
                <span className="text-sm text-bone-color-faded">
                  {isRated ? 'Affects ratings' : 'Casual play'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-bone-color">Round Time Limit</Label>
            <Select value={roundTimeLimit} onValueChange={setRoundTimeLimit} disabled={isSending}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
                <SelectContent>
                    <SelectItem value="0.5">30 minutes</SelectItem>
                    <SelectItem value="0.75">45 minutes</SelectItem>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="1.5">1.5 hours</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="3">3 hours</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                    <SelectItem value="5">5 hours</SelectItem>
                    <SelectItem value="12">12 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="48">48 hours</SelectItem>
                    <SelectItem value="72">72 hours</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} className="text-bone-color border-bone-color hover:bg-white/10">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isSending} style={{ backgroundColor: '#f26222', color: 'white' }}>
            {isSending ? 'Creating...' : 'Create Tournament'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
