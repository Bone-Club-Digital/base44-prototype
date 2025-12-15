import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, GripVertical } from 'lucide-react';
import { LeagueParticipant } from '@/entities/LeagueParticipant';

export default function EditDivisionsModal({ isOpen, onClose, league, divisions, participants, onUpdate }) {
    const [divisionState, setDivisionState] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && divisions.length > 0 && participants.length > 0) {
            const newDivisionState = {};
            divisions.forEach(div => {
                newDivisionState[div.id] = participants.filter(p => p.division_id === div.id);
            });
            setDivisionState(newDivisionState);
        }
    }, [isOpen, divisions, participants]);

    const onDragEnd = (result) => {
        const { source, destination } = result;

        if (!destination) return;

        const sourceDivisionId = source.droppableId;
        const destDivisionId = destination.droppableId;

        const sourceDivision = Array.from(divisionState[sourceDivisionId]);
        const [movedPlayer] = sourceDivision.splice(source.index, 1);

        if (sourceDivisionId === destDivisionId) {
            sourceDivision.splice(destination.index, 0, movedPlayer);
            setDivisionState({
                ...divisionState,
                [sourceDivisionId]: sourceDivision,
            });
        } else {
            const destDivision = Array.from(divisionState[destDivisionId]);
            destDivision.splice(destination.index, 0, movedPlayer);
            setDivisionState({
                ...divisionState,
                [sourceDivisionId]: sourceDivision,
                [destDivisionId]: destDivision,
            });
        }
    };

    const handleSaveChanges = async () => {
        setIsSubmitting(true);
        try {
            const updatePromises = [];
            for (const divisionId in divisionState) {
                divisionState[divisionId].forEach(player => {
                    if (player.division_id !== divisionId) {
                        updatePromises.push(
                            LeagueParticipant.update(player.id, { division_id: divisionId })
                        );
                    }
                });
            }
            await Promise.all(updatePromises);
            onUpdate();
            onClose();
        } catch (error) {
            console.error("Failed to save division changes:", error);
            alert("An error occurred while saving. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl" style={{ backgroundColor: '#e5e4cd' }}>
                <DialogHeader>
                    <DialogTitle className="main-text">Edit Divisions</DialogTitle>
                    <DialogDescription className="main-text opacity-80">
                        Drag and drop players to move them between divisions.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[70vh] overflow-y-auto">
                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {divisions.sort((a, b) => a.division_number - b.division_number).map(div => (
                                <Droppable droppableId={div.id} key={div.id}>
                                    {(provided) => (
                                        <Card
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className="tool-card-bg border-0"
                                        >
                                            <CardHeader>
                                                <CardTitle className="main-text">{div.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-2 min-h-[100px]">
                                                {(divisionState[div.id] || []).map((player, index) => (
                                                    <Draggable key={player.id} draggableId={player.id} index={index}>
                                                        {(provided) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className="flex items-center gap-3 p-2 rounded-md bg-white/30"
                                                            >
                                                                <GripVertical className="w-5 h-5 main-text opacity-50" />
                                                                <Avatar className="w-8 h-8">
                                                                    <AvatarImage src={player.profile_picture_url} />
                                                                    <AvatarFallback>{player.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="main-text font-medium">{player.username}</span>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </CardContent>
                                        </Card>
                                    )}
                                </Droppable>
                            ))}
                        </div>
                    </DragDropContext>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSaveChanges} disabled={isSubmitting} style={{ backgroundColor: '#007e81', color: 'white' }}>
                        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}