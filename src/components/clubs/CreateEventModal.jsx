
import React, { useState, useEffect } from 'react';
import { useUser } from '../auth/UserProvider';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClubEvent } from '@/entities/ClubEvent';
import { format } from 'date-fns';

export default function CreateEventModal({ isOpen, onClose, clubId, clubName, onEventCreated, eventToEdit = null }) {
  const { user } = useUser();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    venue: '',
    start_time: '',
    end_time: '',
    price: '0',
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      venue: '',
      start_time: '',
      end_time: '',
      price: '0',
    });
    setError('');
  };

  useEffect(() => {
    if (isOpen) {
      if (eventToEdit) {
        // Editing existing event
        setFormData({
          title: eventToEdit.title,
          description: eventToEdit.description,
          venue: eventToEdit.venue,
          start_time: format(new Date(eventToEdit.start_time), "yyyy-MM-dd'T'HH:mm"),
          end_time: format(new Date(eventToEdit.end_time), "yyyy-MM-dd'T'HH:mm"),
          price: eventToEdit.price.toString(),
        });
      } else {
        // Creating new event
        resetForm();
      }
    }
  }, [eventToEdit, isOpen]);

  const handleSave = async () => {
    if (!formData.title || !formData.venue || !formData.start_time || !formData.end_time) {
      setError('Please fill in all required fields: Title, Venue, Start Time, and End Time.');
      return;
    }
    
    if (new Date(formData.end_time) <= new Date(formData.start_time)) {
        setError("End time must be after the start time.");
        return;
    }

    setIsSaving(true);
    setError('');

    try {
      const eventData = {
        club_id: clubId,
        club_name: clubName,
        title: formData.title,
        description: formData.description,
        venue: formData.venue,
        start_time: new Date(formData.start_time).toISOString(), // Convert to ISO string
        end_time: new Date(formData.end_time).toISOString(),     // Convert to ISO string
        price: parseFloat(formData.price) || 0,
        created_by: user.id
      };
      
      let savedEvent; // To hold the created or updated event
      if (eventToEdit) {
        savedEvent = await ClubEvent.update(eventToEdit.id, eventData);
      } else {
        savedEvent = await ClubEvent.create({ ...eventData, status: 'upcoming' });
      }

      onEventCreated(savedEvent); // Pass the created/updated event to the callback
      onClose(); // Close the modal on successful save/update
    } catch (error) {
      console.error('Error saving event:', error);
      setError('Failed to save the event. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] text-white" style={{ backgroundColor: '#5a3217' }}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-white uppercase">{eventToEdit ? 'Edit Event' : 'Create New Event'}</DialogTitle>
          <DialogDescription className="text-bone-color-faded">
            {eventToEdit ? 'Update the details for your event.' : `Schedule a new event for ${clubName}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="title" className="text-bone-color">Event Title</Label>
            <Input id="title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-white/10 border-white/20 text-white" />
          </div>
          <div>
            <Label htmlFor="description" className="text-bone-color">Description</Label>
            <Textarea id="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-white/10 border-white/20 text-white" />
          </div>
          <div>
            <Label htmlFor="venue" className="text-bone-color">Venue / Location</Label>
            <Input id="venue" value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} className="bg-white/10 border-white/20 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time" className="text-bone-color">Start Time</Label>
              <Input id="start_time" type="datetime-local" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <Label htmlFor="end_time" className="text-bone-color">End Time</Label>
              <Input id="end_time" type="datetime-local" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>
          <div>
            <Label htmlFor="price" className="text-bone-color">Price ($)</Label>
            <Input id="price" type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="0 for free" className="bg-white/10 border-white/20 text-white" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} style={{ backgroundColor: '#f26222', color: 'white' }} disabled={isSaving}>
            {isSaving ? 'Saving...' : (eventToEdit ? 'Update Event' : 'Create Event')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
