import React, { useState, useEffect } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { useNavigate } from 'react-router-dom';
import { Plan } from '@/entities/Plan';
import { User } from '@/entities/User';
import PlanCard from '../components/membership/PlanCard';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

export default function MembershipPage() {
    const { user, plan: currentUserPlan, loading: userLoading, refetchUser } = useUser();
    const [allPlans, setAllPlans] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const plans = await Plan.list();
                // Define the desired order
                const order = ['Free', 'Member', 'VIP'];
                const sortedPlans = plans.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
                setAllPlans(sortedPlans);
            } catch (error) {
                console.error("Failed to fetch plans:", error);
            } finally {
                setLoadingPlans(false);
            }
        };
        fetchPlans();
    }, []);

    const handleSelectPlan = async (targetPlan) => {
        if (!user) {
            User.login();
            return;
        }

        // Prevent re-selecting the same plan
        if (currentUserPlan?.id === targetPlan.id) {
            return;
        }

        let newBonesBalance = user.bones_balance;
        let newEndDate = null;

        // Logic for paid plans (Member or VIP)
        if (targetPlan.name !== 'Free') {
            alert(`Simulating payment for ${targetPlan.name} plan. In a real scenario, this would involve a payment gateway.`);

            // Add a year's worth of bones on "payment"
            if (targetPlan.bones_monthly > 0) {
               newBonesBalance += targetPlan.bones_monthly * 12;
            }

            const now = new Date();
            newEndDate = new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();

        // Logic for free plan (downgrade)
        } else {
             if (currentUserPlan && currentUserPlan.name !== 'Free') {
                if (!window.confirm('Are you sure you want to switch to the Free plan? Your current subscription will be cancelled immediately.')) {
                    return;
                }
             }
             // newEndDate remains null for the free plan
        }
        
        try {
            await User.updateMyUserData({ 
                plan_id: targetPlan.id, 
                subscription_end_date: newEndDate,
                bones_balance: newBonesBalance
            });
    
            alert(`Success! You are now on the ${targetPlan.name} plan.`);
            await refetchUser();

        } catch (error) {
            console.error("Failed to update plan:", error);
            alert(`There was an error updating your plan: ${error.message}`);
        }
    };

    if (userLoading || loadingPlans) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
                <RefreshCw className="w-12 h-12 animate-spin main-text" />
            </div>
        );
    }
    
    return (
        <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold main-text">Membership Plans</h1>
                    <p className="main-text opacity-70 mt-2 text-lg">Choose the plan that's right for you.</p>
                </div>

                {user && currentUserPlan && currentUserPlan.name !== 'Free' && (
                    <Card className="mb-12 tool-card-bg border-0 elegant-shadow max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle className="main-text text-center">Your Current Subscription</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-2xl font-bold highlight-text">{currentUserPlan.name} Plan</p>
                            {user.subscription_end_date ? (
                                <p className="main-text opacity-80 mt-1">
                                    Your plan renews on {format(new Date(user.subscription_end_date), 'MMMM d, yyyy')}.
                                </p>
                            ) : (
                                <p className="main-text opacity-80 mt-1">You are on the free plan.</p>
                            )}
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {allPlans.map(plan => {
                        return (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                isCurrentUserPlan={currentUserPlan?.id === plan.id}
                                onAction={handleSelectPlan}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}