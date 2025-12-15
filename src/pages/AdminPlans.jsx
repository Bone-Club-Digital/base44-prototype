
import React, { useState, useEffect } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Plan } from '@/entities/Plan';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AdminPlansPage() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_monthly: '',
    price_yearly: '',
    features: '',
    bones_monthly: '',
    shop_discount: '',
    is_active: true
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate(createPageUrl('Home'));
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchPlans();
    }
  }, [user]);

  const fetchPlans = async () => {
    try {
      const planList = await Plan.list();
      setPlans(planList);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setPlansLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price_monthly: '',
      price_yearly: '',
      features: '',
      bones_monthly: '',
      shop_discount: '',
      is_active: true
    });
    setEditingPlan(null);
    setIsCreating(false);
  };

  const handleEdit = (plan) => {
    setFormData({
      name: plan.name,
      description: plan.description,
      price_monthly: plan.price_monthly?.toString() || '',
      price_yearly: plan.price_yearly?.toString() || '',
      features: plan.features?.join(', ') || '',
      bones_monthly: plan.bones_monthly?.toString() || '',
      shop_discount: plan.shop_discount?.toString() || '',
      is_active: plan.is_active
    });
    setEditingPlan(plan.id);
    setIsCreating(false);
  };

  const handleCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleSave = async () => {
    try {
      const planData = {
        ...formData,
        price_monthly: parseFloat(formData.price_monthly) || 0,
        price_yearly: parseFloat(formData.price_yearly) || 0,
        bones_monthly: parseInt(formData.bones_monthly) || 0,
        shop_discount: parseFloat(formData.shop_discount) || 0,
        features: formData.features.split(',').map(f => f.trim()).filter(f => f),
      };

      if (editingPlan) {
        await Plan.update(editingPlan, planData);
      } else {
        await Plan.create(planData);
      }

      await fetchPlans();
      resetForm();
      alert(editingPlan ? 'Plan updated successfully!' : 'Plan created successfully!');
    } catch (error) {
      console.error('Error saving plan:', error);
      alert('Failed to save plan. Please try again.');
    }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this plan? This action cannot be undone.')) return;
    try {
      await Plan.delete(planId);
      await fetchPlans();
      alert('Plan deleted successfully!');
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('Failed to delete plan. Please try again.');
    }
  };

  if (loading || plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#5a3217] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="main-text">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to={createPageUrl("Admin")} className="flex items-center gap-2 hover:opacity-70 transition-colors" style={{ color: '#5a3217' }}>
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Admin</span>
          </Link>
          <Button onClick={handleCreate} style={{ backgroundColor: '#f26222', color: 'white' }} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add New Plan
          </Button>
        </div>

        <h1 className="text-4xl font-bold main-text mb-8">Plan Management</h1>

        {(isCreating || editingPlan) && (
          <Card className="tool-card-bg border-0 elegant-shadow mb-8">
            <CardHeader><CardTitle className="main-text">{isCreating ? 'Create New Plan' : 'Edit Plan'}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Plan Name (e.g., VIP)" />
              <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Plan Description" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input type="number" value={formData.price_monthly} onChange={(e) => setFormData({...formData, price_monthly: e.target.value})} placeholder="Monthly Price (£)" />
                <Input type="number" value={formData.price_yearly} onChange={(e) => setFormData({...formData, price_yearly: e.target.value})} placeholder="Yearly Price (£)" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input type="number" value={formData.bones_monthly} onChange={(e) => setFormData({...formData, bones_monthly: e.target.value})} placeholder="Monthly Bones (0 for none)" />
                <Input type="number" value={formData.shop_discount} onChange={(e) => setFormData({...formData, shop_discount: e.target.value})} placeholder="Shop Discount % (0 for none)" />
              </div>
              <Textarea value={formData.features} onChange={(e) => setFormData({...formData, features: e.target.value})} placeholder="Features (comma-separated)" />
              <div className="flex items-center space-x-2">
                <Switch id="is-active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({...formData, is_active: checked})} />
                <label htmlFor="is-active" className="text-sm font-medium main-text">Plan is Active</label>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} style={{ backgroundColor: '#007e81', color: 'white' }}><Save className="w-4 h-4 mr-2" />Save Plan</Button>
                <Button onClick={resetForm} variant="outline"><X className="w-4 h-4 mr-2" />Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <Card key={plan.id} className="tool-card-bg border-0 elegant-shadow flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="main-text">{plan.name}</CardTitle>
                  <Badge variant={plan.is_active ? 'default' : 'destructive'} style={plan.is_active ? { backgroundColor: '#007e81' } : {}}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="main-text opacity-70 pt-2">{plan.description}</p>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="mb-4">
                  <span className="text-3xl font-bold main-text">£{plan.price_monthly}</span>
                  <span className="main-text opacity-70">/month</span>
                  {plan.price_yearly > 0 && <span className="text-sm main-text opacity-60"> (or £{plan.price_yearly}/year)</span>}
                </div>
                
                {/* Additional plan benefits */}
                {(plan.bones_monthly > 0 || plan.shop_discount > 0) && (
                  <div className="mb-4 p-3 bg-white/20 rounded-lg">
                    {plan.bones_monthly > 0 && (
                      <div className="flex items-center gap-2 text-sm main-text">
                        <span className="font-bold highlight-text">{plan.bones_monthly}</span>
                        <span className="highlight-text">🦴 Bones monthly</span>
                      </div>
                    )}
                    {plan.shop_discount > 0 && (
                      <div className="text-sm main-text">
                        {plan.shop_discount}% discount on boards over £500
                      </div>
                    )}
                  </div>
                )}
                
                {/* Hierarchical feature display */}
                <div className="space-y-2 text-sm main-text">
                  {plan.name === 'Member' && (
                    <div className="italic text-xs main-text opacity-60 mb-3">
                      Everything in FREE plan plus...
                    </div>
                  )}
                  {plan.name === 'VIP' && (
                    <div className="italic text-xs main-text opacity-60 mb-3">
                      Everything in MEMBER plan plus...
                    </div>
                  )}
                  
                  <ul className="space-y-2">
                    {plan.features?.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full highlight-accent"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              <div className="p-4 flex gap-2 border-t border-[#5a3217]/10">
                <Button size="sm" onClick={() => handleEdit(plan)} variant="outline" className="flex-1"><Edit className="w-3 h-3 mr-1" /> Edit</Button>
                <Button size="sm" onClick={() => handleDelete(plan.id)} variant="destructive"><Trash2 className="w-3 h-3" /></Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
