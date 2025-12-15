import React from 'react';
import { useUser } from '../components/auth/UserProvider';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Lock, Star } from 'lucide-react';

export default function AcademyPage() {
    const { user, plan, loading } = useUser();
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
                <div className="w-12 h-12 border-4 border-[#5a3217] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user || plan?.name !== 'VIP') {
        return (
            <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#e5e4cd' }}>
                <Card className="tool-card-bg border-0 elegant-shadow text-center max-w-lg">
                    <CardHeader>
                        <Lock className="w-16 h-16 mx-auto main-text opacity-50 mb-4" />
                        <CardTitle className="main-text">VIP Access Required</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="main-text opacity-80 mb-6">
                            The Bone Club Academy, with its advanced tutorials and strategy guides, is a premium feature available exclusively to our VIP members.
                        </p>
                        <Button 
                            style={{ backgroundColor: '#f26222', color: 'white' }}
                            // This should eventually link to a plans/upgrade page
                            onClick={() => alert("Upgrade functionality coming soon!")}
                        >
                            <Star className="w-4 h-4 mr-2" />
                            Upgrade to VIP
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <GraduationCap className="w-20 h-20 mx-auto main-text mb-4" />
                    <h1 className="text-5xl font-bold main-text">Bone Club Academy</h1>
                    <p className="main-text opacity-70 mt-2 text-lg">Welcome, VIP. Sharpen your skills and master the game.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="tool-card-bg border-0 elegant-shadow">
                        <CardHeader><CardTitle className="main-text">Advanced Opening Strategy</CardTitle></CardHeader>
                        <CardContent><p className="main-text opacity-80">Deep dive into the mathematics and strategy behind the opening rolls.</p></CardContent>
                    </Card>
                    <Card className="tool-card-bg border-0 elegant-shadow">
                        <CardHeader><CardTitle className="main-text">Mastering the Doubling Cube</CardTitle></CardHeader>
                        <CardContent><p className="main-text opacity-80">Learn when to offer, accept, and reject doubles with expert analysis.</p></CardContent>
                    </Card>
                    <Card className="tool-card-bg border-0 elegant-shadow">
                        <CardHeader><CardTitle className="main-text">Endgame Precision</CardTitle></CardHeader>
                        <CardContent><p className="main-text opacity-80">Techniques for bearing off efficiently and handling complex race situations.</p></CardContent>
                    </Card>
                    <Card className="tool-card-bg border-0 elegant-shadow">
                        <CardHeader><CardTitle className="main-text">Blocking and Priming</CardTitle></CardHeader>
                        <CardContent><p className="main-text opacity-80">A complete guide to building effective primes and dismantling your opponent's.</p></CardContent>
                    </Card>
                </div>
                 <div className="text-center mt-12 main-text opacity-60">
                    <p>More content coming soon...</p>
                </div>
            </div>
        </div>
    );
}