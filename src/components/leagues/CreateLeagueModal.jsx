
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { AlertTriangle, Calendar as CalendarIcon, Loader2, CheckCircle, Video, Clock } from 'lucide-react';

export default function CreateLeagueModal({ isOpen, onClose, onSubmit, clubId, clubName }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    players_per_division: 8,
    promoted_relegated_count_per_division: 1,
    format: 'round_robin',
    match_play_type: 'online',
    default_bones_stake: 0,
    default_target_score: 5,
    default_use_clock: false,
    default_use_video_chat: false,
    default_initial_time_minutes: 10,
    default_grace_period_seconds: 12,
    default_is_rated: true, // Added new state for rated league
    registration_end_date: null,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value, 10) : value),
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: isNaN(Number(value)) ? value : Number(value),
    }));
  };

  const handleSwitchChange = (name, checked) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, registration_end_date: date }));
  };

  const validationInfo = useMemo(() => {
    const players = formData.players_per_division;
    const prCount = formData.promoted_relegated_count_per_division;
    const staying = players - (prCount * 2);
    const isValid = staying >= 0;
    
    return {
      isValid,
      staying,
      message: `${isValid ? 'Valid' : 'Invalid'}: ${prCount} up/down with ${staying} players staying in their division.`
    };
  }, [formData.players_per_division, formData.promoted_relegated_count_per_division]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert("League name is required.");
      return;
    }

    if (!validationInfo.isValid) {
      alert("Invalid configuration: Each division must have more players than twice the promotion/relegation count.");
      return;
    }

    if (validationInfo.staying === 0) {
      if (!confirm("Warning: All players will either be promoted or relegated. No players will stay in their current division. Continue?")) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        club_id: clubId,
        club_name: clubName,
        ...formData,
        registration_end_date: formData.registration_end_date ? formData.registration_end_date.toISOString() : null,
      });
    } catch (error) {
      console.error("Failed to create league:", error);
      alert("An error occurred while creating the league. Please check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl text-white" style={{ backgroundColor: '#5a3217' }}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-white uppercase">Create New League</DialogTitle>
          <DialogDescription className="text-bone-color-faded">
            Configure the settings for a new league in {clubName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* League Info */}
          <div className="space-y-2">
            <Label htmlFor="name">League Name</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g., Summer Ladder 2024" className="bg-white/10 border-white/20 text-white placeholder:text-white/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder="A short description of the league's format and rules." className="bg-white/10 border-white/20 text-white placeholder:text-white/50" />
          </div>

          {/* Registration Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="registration_end_date">Registration Closes</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal bg-white/10 border-white/20 text-white hover:text-white hover:bg-white/20 disabled:opacity-50">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.registration_end_date ? format(formData.registration_end_date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.registration_end_date}
                  onSelect={handleDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Division and P/R settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="players_per_division">Players per Division</Label>
              <Select name="players_per_division" value={String(formData.players_per_division)} onValueChange={(v) => handleSelectChange('players_per_division', v)}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>{[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="promoted_relegated_count_per_division">Promotion/Relegation Spots</Label>
              <Select name="promoted_relegated_count_per_division" value={String(formData.promoted_relegated_count_per_division)} onValueChange={(v) => handleSelectChange('promoted_relegated_count_per_division', v)}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>{[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Validation Message */}
          <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${
            validationInfo.isValid 
              ? 'bg-green-900/50 border border-green-500 text-green-300'
              : 'bg-red-900/50 border border-red-500 text-red-300'
          }`}>
            {validationInfo.isValid ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{validationInfo.message}</span>
          </div>

          {/* Match Play Type */}
          <div className="space-y-2">
            <Label htmlFor="match_play_type">Match Play Type</Label>
            <Select name="match_play_type" value={formData.match_play_type} onValueChange={(v) => handleSelectChange('match_play_type', v)}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online (Automated)</SelectItem>
                <SelectItem value="offline">Offline (Manual Reporting)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Match Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white">Default Match Settings</h4>
            
            {/* Gameplay settings (format and target score) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="format">Format</Label>
                <Select name="format" value={formData.format} onValueChange={(v) => handleSelectChange('format', v)}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                    <SelectItem value="double_round_robin">Double Round Robin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_target_score">Default Match Length</Label>
                <Select name="default_target_score" value={String(formData.default_target_score)} onValueChange={(v) => handleSelectChange('default_target_score', v)}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{[1, 3, 5, 7, 9, 11, 13, 15].map(n => <SelectItem key={n} value={String(n)}>{n} points</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Default Bones Stake */}
            <div className="space-y-2">
              <Label htmlFor="default_bones_stake">Default Bones Stake</Label>
              <Select name="default_bones_stake" value={String(formData.default_bones_stake)} onValueChange={(v) => handleSelectChange('default_bones_stake', v)}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>{[0, 5, 10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n === 0 ? 'No Stake' : `${n} Bones`}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Clock Settings */}
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="default_use_clock" className="text-right text-bone-color">
                    Use Clock
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                    <Switch
                        id="default_use_clock"
                        checked={formData.default_use_clock}
                        onCheckedChange={(checked) => handleSwitchChange('default_use_clock', checked)}
                    />
                    <Clock className="w-4 h-4 text-bone-color-faded" />
                </div>
            </div>

            {formData.default_use_clock && (
                <>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="default_initial_time_minutes" className="text-right text-bone-color text-sm">
                            Minutes per Game (Match Score)
                        </Label>
                        <Select 
                            value={String(formData.default_initial_time_minutes)} 
                            onValueChange={(value) => handleSelectChange('default_initial_time_minutes', value)}
                        >
                            <SelectTrigger className="col-span-3 bg-[#e5e4cd] text-[#5a3217] border-transparent">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[1, 2, 3, 5, 10, 15, 20, 30].map(minutes => (
                                    <SelectItem key={minutes} value={String(minutes)}>
                                        {minutes} minute{minutes !== 1 ? 's' : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="default_grace_period_seconds" className="text-right text-bone-color text-sm">
                            Grace Period (Seconds)
                        </Label>
                        <Select 
                            value={String(formData.default_grace_period_seconds)} 
                            onValueChange={(value) => handleSelectChange('default_grace_period_seconds', value)}
                        >
                            <SelectTrigger className="col-span-3 bg-[#e5e4cd] text-[#5a3217] border-transparent">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[5, 10, 12, 15, 20, 30].map(seconds => (
                                    <SelectItem key={seconds} value={String(seconds)}>
                                        {seconds} second{seconds !== 1 ? 's' : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </>
            )}

            {/* Video Chat Settings */}
            <div className="flex items-center space-x-2">
              <Switch id="default_use_video_chat" checked={formData.default_use_video_chat} onCheckedChange={(c) => handleSwitchChange('default_use_video_chat', c)} />
              <Video className="w-4 h-4 text-bone-color" />
              <Label htmlFor="default_use_video_chat">Enable Video Chat for Matches</Label>
            </div>
            
            {/* NEW: Rated League Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="default_is_rated" className="text-sm text-white">Rated League</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="default_is_rated"
                  checked={formData.default_is_rated}
                  onCheckedChange={(checked) => handleSwitchChange('default_is_rated', checked)}
                  disabled={isSubmitting}
                />
                <span className="text-xs text-white opacity-70">
                  {formData.default_is_rated ? 'Affects ratings' : 'Casual play'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="text-bone-color border-bone-color hover:bg-white/10" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} style={{ backgroundColor: '#f26222', color: 'white' }} disabled={isSubmitting || !validationInfo.isValid}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Creating...' : 'Create League'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
