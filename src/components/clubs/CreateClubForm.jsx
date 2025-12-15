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
import { Textarea } from "@/components/ui/textarea";

export default function CreateClubForm({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [strapline, setStrapline] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("Club name is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onCreate({ name, strapline, description });
      setName('');
      setStrapline('');
      setDescription('');
    } catch (error) {
      // Error is handled by the parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] text-white" style={{ backgroundColor: '#5a3217' }}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-white uppercase">Create a New Club</DialogTitle>
          <DialogDescription className="text-bone-color-faded">
            Start a new club and invite your friends to play.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="club-name" className="text-bone-color">Club Name</Label>
            <Input
              id="club-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., The Backgammon Pros"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="club-strapline" className="text-bone-color">Strapline (Optional)</Label>
            <Input
              id="club-strapline"
              value={strapline}
              onChange={(e) => setStrapline(e.target.value)}
              placeholder="e.g., Big venue, Great Food, Great Drinks!"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="club-description" className="text-bone-color">Description (Optional)</Label>
            <Textarea
              id="club-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A detailed description of your club..."
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              rows={3}
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="text-bone-color border-bone-color hover:bg-white/10">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} style={{ backgroundColor: '#f26222', color: 'white' }}>
            {isSubmitting ? 'Creating...' : 'Create Club'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}