import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, X } from 'lucide-react';

export default function SuccessNotification({ title, message, onClose, actionText, onAction }) {
  if (!message) return null;

  return (
    <Card className="border-0 elegant-shadow mb-6" style={{ backgroundColor: '#007e81' }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <CheckCircle className="w-6 h-6 text-bone-color flex-shrink-0" />
            <div>
              <p className="font-bold text-bone-color">{title}</p>
              <p className="text-sm text-bone-color opacity-90">{message}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-bone-color hover:bg-white/20 flex-shrink-0">
            <X className="w-5 h-5" />
          </Button>
        </div>
        {actionText && onAction && (
          <div className="flex justify-start">
            <Button
              onClick={onAction}
              size="sm"
              style={{ backgroundColor: '#9fd3ba', color: '#5a3217' }}
              className="hover:opacity-90"
            >
              {actionText}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}