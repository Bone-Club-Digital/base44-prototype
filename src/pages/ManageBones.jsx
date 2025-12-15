
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BonesTransaction } from '@/entities/BonesTransaction';
import { useUser } from '../components/auth/UserProvider';
import { format } from 'date-fns';
import { RefreshCw, Coins, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

export default function ManageBonesPage() {
  const { user, plan, loading: userLoading } = useUser();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      // If user is not available yet, we can't fetch transactions.
      // This prevents issues when user is null initially.
      return;
    }
    
    setLoading(true);
    try {
      const userTransactions = await BonesTransaction.filter({ user_id: user.id }, '-created_date', 100);
      setTransactions(userTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [user]); // `user` is a dependency because `user.id` is used inside

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]); // `fetchTransactions` is a dependency because it's a memoized function

  const getTransactionIcon = (type) => {
    const iconProps = { className: "w-4 h-4" };
    
    switch (type) {
      case 'game_win':
      case 'initial_bonus':
      case 'monthly_allocation':
        return <TrendingUp {...iconProps} className="w-4 h-4 text-green-600" />;
      case 'game_loss':
      case 'redemption':
      case 'tournament_entry':
        return <TrendingDown {...iconProps} className="w-4 h-4 text-red-600" />;
      default:
        return <Coins {...iconProps} className="w-4 h-4 text-blue-600" />;
    }
  };

  const getTransactionColor = (amount) => {
    return amount > 0 ? 'text-green-600' : 'text-red-600';
  };

  const formatAmount = (amount) => {
    const sign = amount > 0 ? '+' : '';
    return `${sign}${amount}`;
  };

  const calculateNextAllocation = () => {
    if (!user || !plan || plan.name === 'FREE' || !plan.bones_monthly) {
      return null;
    }

    const lastAllocation = user.last_monthly_bones_allocation_date 
      ? new Date(user.last_monthly_bones_allocation_date)
      : user.subscription_start_date 
        ? new Date(user.subscription_start_date)
        : new Date(user.created_date);

    const nextAllocation = new Date(lastAllocation);
    nextAllocation.setMonth(nextAllocation.getMonth() + 1);
    
    return nextAllocation;
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: '#5a3217' }} />
          <p className="main-text">Loading bones data...</p>
        </div>
      </div>
    );
  }

  const nextAllocation = calculateNextAllocation();
  const isOnPaidPlan = plan && plan.name !== 'FREE';

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold main-text mb-8">Manage Bones</h1>

        {/* Current Balance & Subscription Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="tool-card-bg border-0 elegant-shadow">
            <CardHeader>
              <CardTitle className="main-text flex items-center gap-2">
                <Coins className="w-5 h-5" />
                Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold highlight-text">
                🦴 {user?.bones_balance || 0}
              </div>
              <p className="text-sm main-text opacity-70 mt-2">
                Available for games and purchases
              </p>
            </CardContent>
          </Card>

          <Card className="tool-card-bg border-0 elegant-shadow">
            <CardHeader>
              <CardTitle className="main-text flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Subscription Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge 
                  className="text-sm"
                  style={{ 
                    backgroundColor: isOnPaidPlan ? '#007e81' : '#6b7280', 
                    color: 'white' 
                  }}
                >
                  {plan?.name || 'FREE'}
                </Badge>
                
                {isOnPaidPlan ? (
                  <>
                    {user.subscription_start_date && (
                      <p className="text-sm main-text">
                        <strong>Subscribed since:</strong> {format(new Date(user.subscription_start_date), 'dd MMM yyyy')}
                      </p>
                    )}
                    {plan.bones_monthly > 0 && nextAllocation && (
                      <p className="text-sm main-text">
                        <strong>Next {plan.bones_monthly} bones:</strong> {format(nextAllocation, 'dd MMM yyyy')}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm main-text opacity-70">
                    You are not currently on a paid plan
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card className="tool-card-bg border-0 elegant-shadow">
          <CardHeader>
            <CardTitle className="main-text">Bones Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
              <div className="space-y-2">
                {transactions.map(transaction => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-white/30">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.type)}
                      <div>
                        <p className="font-medium main-text text-sm">{transaction.description}</p>
                        <p className="text-xs main-text opacity-60">
                          {format(new Date(transaction.created_date), 'dd MMM yyyy, HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${getTransactionColor(transaction.amount)}`}>
                        {formatAmount(transaction.amount)}
                      </p>
                      <p className="text-xs main-text opacity-60">
                        Balance: {transaction.current_balance}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Coins className="w-12 h-12 main-text opacity-50 mx-auto mb-4" />
                <p className="main-text opacity-70">No transaction history available</p>
                <p className="text-sm main-text opacity-50 mt-1">
                  Your bones transactions will appear here as you play games and make purchases.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
