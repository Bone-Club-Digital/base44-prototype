
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, ArrowDownCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downgradeToFreePlan } from '@/functions/downgradeToFreePlan';
import { deleteMyAccount } from '@/functions/deleteMyAccount';


export default function DeleteAccountModal({ isOpen, onClose, plan, onDowngradeSuccess, onDeleteSuccess }) {
  const [confirmationText, setConfirmationText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const isPaidUser = plan && plan.name !== 'FREE';
  const defaultTab = isPaidUser ? 'downgrade' : 'delete';

  const handleDowngrade = async () => {
    setIsProcessing(true);
    setError('');
    try {
      await downgradeToFreePlan();
      alert('Your plan has been successfully downgraded to FREE.');
      onDowngradeSuccess();
    } catch (e) {
      console.error("Downgrade failed:", e);
      setError(e.response?.data?.error || 'Failed to downgrade plan. Please try again or contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (confirmationText !== 'DELETE MY ACCOUNT') {
      setError('You must type "DELETE MY ACCOUNT" to confirm.');
      return;
    }
    setIsProcessing(true);
    setError('');
    try {
      await deleteMyAccount();
      alert('Your account has been permanently deleted.');
      onDeleteSuccess();
    } catch (e) {
      console.error("Deletion failed:", e);
      
      // Handle different error types
      let errorMessage = 'Failed to delete account. Please try again or contact support.';
      
      if (e.response && e.response.data && e.response.data.error) {
        // This is the detailed error message from the backend
        errorMessage = e.response.data.error;
      } else if (e.response && e.response.status === 403) {
        errorMessage = 'Account deletion not allowed. You may be a club admin - please transfer ownership first.';
      }
      
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    // Reset state on close
    setConfirmationText('');
    setError('');
    setIsProcessing(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px] tool-card-bg border-0 elegant-shadow">
        <DialogHeader>
          <DialogTitle className="main-text text-2xl">Manage Your Account</DialogTitle>
          <DialogDescription className="main-text opacity-70">
            Please choose an option below. Be careful, some actions are irreversible.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          {isPaidUser && (
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="downgrade">Downgrade</TabsTrigger>
              <TabsTrigger value="delete">Delete Account</TabsTrigger>
            </TabsList>
          )}

          {isPaidUser && (
            <TabsContent value="downgrade">
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <ArrowDownCircle className="w-8 h-8 text-blue-500 flex-shrink-0" />
                  <h3 className="text-lg font-bold main-text">Downgrade to FREE Plan</h3>
                </div>
                <p className="text-sm main-text opacity-80">
                  You can downgrade your account to the FREE plan. This will cancel your paid subscription at the end of the current billing period. You will lose access to premium features, but your account, game history, and Bones will be preserved.
                </p>
                <Button onClick={handleDowngrade} disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {isProcessing ? 'Processing...' : 'Downgrade to FREE'}
                </Button>
              </div>
            </TabsContent>
          )}

          <TabsContent value="delete">
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
                <h3 className="text-lg font-bold main-text">Delete Account Permanently</h3>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-md text-red-700 text-sm space-y-2">
                <p className="font-bold">This action is irreversible.</p>
                <p>All your data including profile, game history, club memberships, and Bones balance will be permanently deleted. Tournament records will be anonymized.</p>
              </div>
              <div>
                <label className="text-sm font-medium main-text block mb-2">
                  To confirm, please type "DELETE MY ACCOUNT" in the box below.
                </label>
                <Input
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="DELETE MY ACCOUNT"
                  className="bg-white/80"
                />
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-md">
                  <p className="text-sm text-red-700 font-medium">Error:</p>
                  <p className="text-sm text-red-600">{error}</p>
                  {error.includes('club admin') && (
                    <p className="text-sm text-red-600 mt-2">
                      <strong>Next steps:</strong> Go to your club settings and either transfer admin ownership to another member or delete the club before trying again.
                    </p>
                  )}
                </div>
              )}
              <Button
                onClick={handleDelete}
                disabled={isProcessing || confirmationText !== 'DELETE MY ACCOUNT'}
                variant="destructive"
                className="w-full"
              >
                {isProcessing ? 'Deleting...' : 'Delete My Account Forever'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
