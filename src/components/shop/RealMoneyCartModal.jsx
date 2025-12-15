
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRealMoneyCart } from './RealMoneyCartProvider';
import { useUser } from '../auth/UserProvider';
import { createPayPalOrder } from '@/functions/createPayPalOrder';
import { capturePayPalOrder } from '@/functions/capturePayPalOrder';
import { getPayPalClientId } from '@/functions/getPayPalClientId';
import { Trash2, Loader2, CheckCircle, ShoppingCart } from 'lucide-react';

export function RealMoneyCartModal({ isOpen, onClose }) {
  const { cart, removeFromCart, clearCart, getTotal, getCartItemsForAPI } = useRealMoneyCart();
  const { user } = useUser();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [orderComplete, setOrderComplete] = useState(false);
  const paypalButtonsRendered = useRef(false);

  const handleGoToCheckout = () => {
    console.log('Navigating to checkout...'); // Debug log
    onClose();
    setTimeout(() => {
      navigate(createPageUrl('Checkout'));
    }, 100); // Small delay to ensure modal closes first
  };

  const renderButtons = useCallback(() => {
    if (window.paypal && document.getElementById('paypal-buttons-container')) {
        paypalButtonsRendered.current = true;
        const paypalContainer = document.getElementById('paypal-buttons-container');
        if (paypalContainer) paypalContainer.innerHTML = '';
        
        window.paypal.Buttons({
            style: { layout: "vertical", color: "gold", shape: "rect", label: "pay" },
            createOrder: async () => {
                setIsProcessing(true);
                setError('');
                try {
                    const { data, error: apiError } = await createPayPalOrder({ cartItems: getCartItemsForAPI() });
                    if (apiError || !data.orderID) {
                        throw new Error(data.error || 'Failed to create order.');
                    }
                    return data.orderID;
                } catch (e) {
                    setError(e.message);
                    setIsProcessing(false);
                    return null;
                }
            },
            onApprove: async (data) => {
                try {
                    const { error: captureError } = await capturePayPalOrder({ orderID: data.orderID, cartItems: getCartItemsForAPI() });
                    if (captureError) {
                        throw new Error(captureError.message || 'Payment capture failed.');
                    }
                    setIsProcessing(false);
                    setOrderComplete(true);
                    clearCart();
                } catch (e) {
                    setError(e.message);
                    setIsProcessing(false);
                }
            },
            onError: (err) => {
                setError('An error occurred with the PayPal transaction. Please try again.');
                setIsProcessing(false);
            },
            onCancel: () => {
                setIsProcessing(false);
            }
        }).render('#paypal-buttons-container');
    }
  }, [getCartItemsForAPI, clearCart]);

  const loadPayPalScriptAndRenderButtons = useCallback(async () => {
    setError('');
    const paypalContainer = document.getElementById('paypal-buttons-container');
    if (!paypalContainer) return;
    
    paypalContainer.innerHTML = '<div class="flex justify-center items-center gap-2 text-center p-4 text-bone-color-faded"><span class="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span><span>Loading Payment...</span></div>';

    try {
        const { data: clientIdData, error: clientIdError } = await getPayPalClientId();
        if (clientIdError || !clientIdData.clientId) {
            throw new Error(clientIdData?.error || 'Could not load payment provider. Please try again.');
        }

        if (document.getElementById('paypal-sdk-script')) {
            renderButtons();
            return;
        }

        const script = document.createElement('script');
        script.id = 'paypal-sdk-script';
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientIdData.clientId}&currency=GBP&intent=capture`; // Changed USD to GBP
        script.onload = renderButtons;
        script.onerror = () => { throw new Error('Failed to load PayPal script.'); };
        document.body.appendChild(script);

    } catch (e) {
        setError(e.message);
        if (paypalContainer) paypalContainer.innerHTML = '';
    }
  }, [renderButtons]);

  useEffect(() => {
    if (isOpen && cart.length > 0 && !paypalButtonsRendered.current) {
        loadPayPalScriptAndRenderButtons();
    }
    
    if (!isOpen) {
        // Reset when modal closes
        paypalButtonsRendered.current = false;
    }
  }, [isOpen, cart, loadPayPalScriptAndRenderButtons]);
  
  const handleCloseAndReset = () => {
    setOrderComplete(false);
    setError('');
    setIsProcessing(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseAndReset}>
      <DialogContent className="sm:max-w-[480px] text-white" style={{ backgroundColor: '#5a3217' }}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-white uppercase flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            Shopping Cart
          </DialogTitle>
        </DialogHeader>

        {orderComplete ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-bone-color mb-2">Order Complete!</h3>
            <p className="text-bone-color-faded mb-6">
              Thank you for your purchase. You will receive an email confirmation shortly.
            </p>
            <Button onClick={handleCloseAndReset} style={{ backgroundColor: '#007e81', color: 'white' }}>
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            {cart.length === 0 ? (
              <div className="text-center py-8 text-bone-color-faded">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Your cart is empty</p>
              </div>
            ) : (
              <>
                <div className="py-4 space-y-4 max-h-96 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/20">
                      <img
                        src={item.product_image_url}
                        alt={item.product_name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      
                      <div className="flex-grow">
                        <h4 className="font-medium text-bone-color">{item.product_name}</h4>
                        <p className="text-sm text-bone-color-faded">
                          ${item.product_real_price.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-bone-color">
                          ${(item.product_real_price * item.quantity).toFixed(2)}
                        </span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {cart.length > 0 && (
                  <div className="pt-4 border-t border-white/20">
                    <div className="flex justify-between items-center w-full p-4 rounded-lg mb-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                      <span className="text-xl font-bold text-bone-color">Total:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold" style={{ color: '#f26222' }}>
                          ${getTotal().toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <Button
                        onClick={handleGoToCheckout}
                        className="w-full"
                        size="lg"
                        style={{ backgroundColor: '#007e81', color: 'white' }}
                        disabled={cart.length === 0}
                      >
                        Proceed to Checkout
                      </Button>
                      
                      <Button variant="outline" onClick={onClose} className="w-full">
                        Continue Shopping
                      </Button>
                    </div>

                    {isProcessing && (
                      <div className="flex justify-center items-center gap-2 mt-4 text-bone-color-faded">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Processing payment...</span>
                      </div>
                    )}
                    
                    <div id="paypal-buttons-container" className="mt-4"></div>
                    
                    {error && (
                      <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                        <p className="text-red-200 text-sm">{error}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
