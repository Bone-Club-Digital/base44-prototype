import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, UserPlus, UserX, Users } from "lucide-react";

export default function FriendActionModal({ isOpen, onClose, type, friendName, onConfirm }) {
  const getModalContent = () => {
    switch (type) {
      case 'add_success':
        return {
          icon: <UserPlus className="w-16 h-16 text-green-500 mx-auto mb-4" />,
          title: 'Friend Request Sent!',
          message: `Your friend request has been sent to ${friendName}. They will receive a notification and can accept or decline your request.`,
          buttonText: 'Great!',
          buttonStyle: { backgroundColor: '#007e81', color: 'white' }
        };
      
      case 'accept_success':
        return {
          icon: <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />,
          title: 'Friend Request Accepted!',
          message: `You are now friends with ${friendName}. You can see them in your friends list and they'll be notified of the acceptance.`,
          buttonText: 'Awesome!',
          buttonStyle: { backgroundColor: '#007e81', color: 'white' }
        };
      
      case 'remove_confirm':
        return {
          icon: <UserX className="w-16 h-16 text-red-500 mx-auto mb-4" />,
          title: 'Remove Friend?',
          message: `Are you sure you want to remove ${friendName} from your friends list? Both of you will be notified of this change.`,
          buttonText: 'Remove Friend',
          buttonStyle: { backgroundColor: '#dc2626', color: 'white' },
          showCancel: true
        };
      
      case 'remove_success':
        return {
          icon: <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />,
          title: 'Friend Removed',
          message: `${friendName} has been removed from your friends list. Both of you have been notified of this change.`,
          buttonText: 'OK',
          buttonStyle: { backgroundColor: '#6b7280', color: 'white' }
        };
      
      default:
        return null;
    }
  };

  const content = getModalContent();
  if (!content) return null;

  const handleAction = () => {
    if (type === 'remove_confirm' && onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] text-center" style={{ backgroundColor: '#e5e4cd' }}>
        <DialogHeader>
          <div className="py-4">
            {content.icon}
            <DialogTitle className="text-xl font-bold main-text mb-3">
              {content.title}
            </DialogTitle>
            <p className="main-text opacity-80 leading-relaxed">
              {content.message}
            </p>
          </div>
        </DialogHeader>
        <div className="flex gap-3 justify-center pb-4">
          {content.showCancel && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button onClick={handleAction} style={content.buttonStyle}>
            {content.buttonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}