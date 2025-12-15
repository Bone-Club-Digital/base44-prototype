
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from './CartProvider';
import { useUser } from '../auth/UserProvider';
import { User } from '@/entities/User'; // Added import for User entity

export default function CartModal({ isOpen, onClose }) {
  const { cartItems, updateQuantity, removeFromCart, getTotalPrice, getTotalItems, clearCart } = useCart();
  const { user, refetchUser } = useUser(); // Added refetchUser

  const handleCheckout = async () => {
    const totalPrice = getTotalPrice();
    
    if (!user || user.bones_balance < totalPrice) {
      alert("You don't have enough Bones to complete this purchase.");
      return;
    }

    if (window.confirm(`Purchase ${getTotalItems()} items for ${totalPrice} Bones?`)) {
      try {
        const newBalance = user.bones_balance - totalPrice;
        await User.updateMyUserData({ bones_balance: newBalance }); // Deduct bones
        await clearCart();
        await refetchUser(); // Refresh user data to show updated balance
        
        alert(`Purchase completed! ${totalPrice} Bones deducted from your account.`);
        onClose();
      } catch (error) {
        console.error("Checkout failed:", error); // Log error for debugging
        alert('Purchase failed. Please try again.');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] text-white" style={{ backgroundColor: '#5a3217' }}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-white uppercase flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            Shopping Cart
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[400px] overflow-y-auto">
          {cartItems.length === 0 ? (
            <div className="text-center py-8 text-bone-color-faded">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <img
                    src={item.product_image_url}
                    alt={item.product_name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  
                  <div className="flex-grow">
                    <h3 className="font-bold text-bone-color">{item.product_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-bold text-lg" style={{ color: '#f26222' }}>
                        {item.product_price}
                      </span>
                      <span className="text-lg">🦴</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="h-8 w-8 p-0"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    
                    <Badge variant="secondary" className="min-w-[2rem] text-center">
                      {item.quantity}
                    </Badge>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeFromCart(item.id)}
                      className="h-8 w-8 p-0 ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {cartItems.length > 0 && (
          <DialogFooter className="flex-col gap-4">
            <div className="flex justify-between items-center w-full p-4 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
              <span className="text-xl font-bold text-bone-color">Total:</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold" style={{ color: '#f26222' }}>
                  {getTotalPrice()}
                </span>
                <span className="text-xl">🦴</span>
              </div>
            </div>
            
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Continue Shopping
              </Button>
              <Button 
                onClick={handleCheckout}
                disabled={!user || user.bones_balance < getTotalPrice()}
                style={{ backgroundColor: '#f26222', color: 'white' }}
                className="flex-1"
              >
                {!user || user.bones_balance < getTotalPrice() ? 'Insufficient Bones' : 'Checkout'}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
