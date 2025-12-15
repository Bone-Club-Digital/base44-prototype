import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

const PlanCard = ({ plan, isCurrentUserPlan, onAction }) => {

  const getButton = () => {
    if (isCurrentUserPlan) {
      return <Button disabled className="w-full">Your Current Plan</Button>;
    }
    
    // Make the VIP button stand out
    const buttonStyle = plan.name === 'VIP' 
      ? { backgroundColor: '#f26222', color: 'white' } 
      : { backgroundColor: '#007e81', color: 'white' };
      
    return (
      <Button onClick={() => onAction(plan)} style={buttonStyle} className="w-full">
        Join {plan.name}
      </Button>
    );
  };
  
  const cardClassName = `tool-card-bg border-0 elegant-shadow flex flex-col h-full ${isCurrentUserPlan ? 'ring-4 ring-offset-2 ring-[#f26222]' : ''}`;

  return (
    <Card className={cardClassName}>
      <CardHeader className="text-center">
        <CardTitle className="main-text text-3xl">{plan.name}</CardTitle>
        <p className="main-text text-4xl font-bold mt-2">£{plan.price_monthly}<span className="text-base font-normal opacity-70">/month</span></p>
        <p className="text-sm main-text opacity-70">{plan.description}</p>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        <div>
          {plan.name === 'Member' && <p className="italic text-xs main-text opacity-70 mb-4">Everything in Free plus...</p>}
          {plan.name === 'VIP' && <p className="italic text-xs main-text opacity-70 mb-4">Everything in Member plus...</p>}
          <ul className="space-y-2 text-sm main-text">
            {plan.features?.map((feature, index) => (
              <li key={index} className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 highlight-text" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-8">
          {getButton()}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanCard;