import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, Send, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { sendFriendInvitationEmail } from '@/functions/sendFriendInvitationEmail';

export default function InviteFriendPanel() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState({ type: null, message: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email) {
            setStatus({ type: 'error', message: 'Email address is required.' });
            return;
        }

        setLoading(true);
        setStatus({ type: null, message: '' });

        try {
            const response = await sendFriendInvitationEmail({
                recipient_email: email,
                custom_message: message
            });

            if (response.data && response.data.success) {
                setStatus({ type: 'success', message: 'Invitation sent successfully!' });
                setEmail('');
                setMessage('');
            } else {
                throw new Error(response.data?.error || 'An unknown error occurred.');
            }
        } catch (error) {
            console.error('Invitation send error:', error);
            const errorMessage = error.response?.data?.error || error.message;
            setStatus({ type: 'error', message: `Failed to send invitation: ${errorMessage}` });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="tool-card-bg border-0 elegant-shadow h-fit">
            <CardHeader>
                <CardTitle className="main-text uppercase flex items-center gap-3">
                    <Mail className="w-6 h-6" />
                    Invite a Friend
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm main-text opacity-80 mb-4">
                    Know someone who would love Bone Club? Send them an invitation to join the community.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="friend-email" className="main-text text-sm">Friend's Email</Label>
                        <Input
                            id="friend-email"
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            required
                            className="mt-1 bg-white/30 border-white/20"
                        />
                    </div>
                    <div>
                        <Label htmlFor="friend-message" className="main-text text-sm">Personal Message (Optional)</Label>
                        <Textarea
                            id="friend-message"
                            placeholder="Hey! Thought you would enjoy this backgammon club..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={loading}
                            className="mt-1 bg-white/30 border-white/20"
                            rows={3}
                        />
                    </div>
                    
                    {status.message && (
                        <div className={`flex items-start gap-2 p-2 rounded-md text-sm ${status.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {status.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                            <span>{status.message}</span>
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full"
                        style={{ backgroundColor: '#f26222', color: 'white' }}
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5 mr-2" />
                        )}
                        Send Invitation
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}