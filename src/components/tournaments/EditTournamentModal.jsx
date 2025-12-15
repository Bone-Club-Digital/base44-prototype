import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Tournament } from '@/entities/Tournament';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from 'date-fns';

export default function EditTournamentModal({ isOpen, onClose, onUpdate, tournament }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('knockout');
  const [entryFee, setEntryFee] = useState("0");
  const [targetScore, setTargetScore] = useState("3");
  const [isSending, setIsSending] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [startTime, setStartTime] = useState('19:00');
  const [locationType, setLocationType] = useState('online');
  const [roundTimeLimit, setRoundTimeLimit] = useState('48');
  const [maxCompetitors, setMaxCompetitors] = useState('');

  useEffect(() => {
    if (tournament) {
      setName(tournament.name || '');
      setDescription(tournament.description || '');
      setType(tournament.type || 'knockout');
      setEntryFee(String(tournament.entry_fee_bones || '0'));
      setTargetScore(String(tournament.match_settings?.targetScore || '3'));
      if (tournament.start_date) {
        const date = new Date(tournament.start_date);
        setStartDate(date);
        setStartTime(format(date, 'HH:mm'));
      }
      setLocationType(tournament.location_type || 'online');
      setRoundTimeLimit(String(tournament.round_time_limit_hours || '48'));
      setMaxCompetitors(tournament.max_competitors ? String(tournament.max_competitors) : '');
    }
  }, [tournament]);

  const handleUpdate = async () => {
    if (!name.trim()) {
      alert("Tournament name is required.");
      return;
    }
    
    setIsSending(true);

    try {
      let combinedStartDateTime = null;
      if (startDate && startTime) {
        const [hours, minutes] = startTime.split(':');
        combinedStartDateTime = new Date(startDate);
        combinedStartDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      
      const updatedData = {
        name,
        description,
        type,
        entry_fee_bones: parseInt(entryFee),
        match_settings: {
          ...tournament.match_settings,
          targetScore: parseInt(targetScore),
        },
        start_date: combinedStartDateTime ? combinedStartDateTime.toISOString() : null,
        location_type: locationType,
        round_time_limit_hours: parseInt(roundTimeLimit),
        max_competitors: maxCompetitors ? parseInt(maxCompetitors) : null,
      };

      await Tournament.update(tournament.id, updatedData);
      
      onUpdate(); // This will close the modal and refresh data
    } catch (error) {
      console.error("Error updating tournament:", error);
      alert("Failed to update tournament.");
    } finally {
      setIsSending(false);
    }
  };

  if (!tournament) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] text-white max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#5a3217' }}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-white uppercase">Edit Tournament</DialogTitle>
          <DialogDescription className="text-bone-color-faded">
            Update the settings for "{tournament.name}".
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="tournament-name" className="text-bone-color">Tournament Name</Label>
            <Input id="tournament-name" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/10 border-white/20 text-white" disabled={isSending} />
          </div>

          <div>
            <Label htmlFor="tournament-description" className="text-bone-color">Description</Label>
            <Textarea id="tournament-description" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white/10 border-white/20 text-white" disabled={isSending} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-bone-color">Tournament Type</Label>
              <Select value={type} onValueChange={setType} disabled={isSending}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
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
                <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="in_person">In Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-bone-color">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left bg-white/10 border-white/20 text-white hover:bg-white/20" disabled={isSending}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-bone-color">Start Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-white/10 border-white/20 text-white" disabled={isSending || !startDate} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-bone-color">Entry Fee (Bones)</Label>
              <Input type="number" value={entryFee} onChange={(e) => setEntryFee(e.target.value)} className="bg-white/10 border-white/20 text-white" disabled={isSending} min="0" />
            </div>

            <div>
              <Label className="text-bone-color">Match Length</Label>
              <Select value={targetScore} onValueChange={setTargetScore} disabled={isSending}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 3, 5, 7, 9, 11, 13, 15].map(score => (<SelectItem key={score} value={String(score)}>{score} points</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-bone-color">Max Players</Label>
              <Input type="number" value={maxCompetitors} onChange={(e) => setMaxCompetitors(e.target.value)} placeholder="No limit" className="bg-white/10 border-white/20 text-white" disabled={isSending} min="2" />
            </div>
          </div>

          <div>
            <Label className="text-bone-color">Round Time Limit (Hours)</Label>
            <Select value={roundTimeLimit} onValueChange={setRoundTimeLimit} disabled={isSending}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="48">48 hours</SelectItem>
                <SelectItem value="72">72 hours</SelectItem>
                <SelectItem value="168">1 week</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="text-bone-color border-bone-color hover:bg-white/10">Cancel</Button>
          <Button onClick={handleUpdate} disabled={isSending} style={{ backgroundColor: '#f26222', color: 'white' }}>
            {isSending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}