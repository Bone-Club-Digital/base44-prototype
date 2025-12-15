
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useRealMoneyCart } from '../components/shop/RealMoneyCartProvider';
import { useUser } from '../components/auth/UserProvider';
import { createPayPalOrder } from '@/functions/createPayPalOrder';
import { capturePayPalOrder } from '@/functions/capturePayPalOrder';
import { getPayPalClientId } from '@/functions/getPayPalClientId';
import { ShoppingCart, Minus, Plus, Trash2, ArrowLeft, CreditCard, Truck, Loader2, CheckCircle } from 'lucide-react';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, getTotal, getTotalItems, loading: cartLoading, clearCart, getCartItemsForAPI } = useRealMoneyCart();
  const { user, loading: userLoading } = useUser();

  console.log(`[CheckoutPage Render] States: userLoading=${userLoading}, cartLoading=${cartLoading}, Cart Items=${cart.length}`);

  const [shippingInfo, setShippingInfo] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'GB'
  });

  const [orderNotes, setOrderNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paypalError, setPaypalError] = useState('');
  const [orderComplete, setOrderComplete] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState(null);
  const paypalButtonsRendered = useRef(false);

  // Debug logging
  useEffect(() => {
    console.log(`[CheckoutPage useEffect] Triggered. Dependencies: userLoading=${userLoading}, cartLoading=${cartLoading}, Cart Items=${cart.length}`);
    // Wait until both user and cart are done loading
    if (userLoading || cartLoading) {
      console.log('[CheckoutPage useEffect] Bailing out: Still loading.');
      return;
    }

    // Now that we're done loading, check conditions for redirect
    if (!user) {
      console.log('[CheckoutPage useEffect] DECISION: No user. Redirecting to Shop.');
      navigate(createPageUrl('Shop'));
      return;
    }

    if (cart.length === 0 && !orderComplete) { // Only redirect if cart is empty AND order is not complete
      console.log('[CheckoutPage useEffect] DECISION: Cart is empty. Redirecting to Shop.');
      navigate(createPageUrl('Shop'));
      return;
    }

    console.log('[CheckoutPage useEffect] DECISION: All clear. Not redirecting.');

  }, [user, userLoading, cart, cartLoading, navigate, orderComplete]);


  const handleInputChange = (field, value) => {
    setShippingInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      await removeFromCart(itemId);
    } else {
      await updateQuantity(itemId, newQuantity);
    }
  };

  const subtotal = getTotal();
  const shipping = subtotal > 100 ? 0 : 12.99; // Free shipping over £100, £12.99 shipping cost
  const tax = subtotal * 0.20; // 20% VAT for UK
  const total = subtotal + shipping + tax;

  // PayPal Integration Functions
  const renderPayPalButtons = useCallback(() => {
    if (window.paypal && document.getElementById('paypal-checkout-buttons')) {
      paypalButtonsRendered.current = true;
      const paypalContainer = document.getElementById('paypal-checkout-buttons');
      if (paypalContainer) paypalContainer.innerHTML = '';
      
      window.paypal.Buttons({
        style: { 
          layout: "vertical", 
          color: "gold", 
          shape: "rect", 
          label: "pay",
          height: 55
        },
        createOrder: async () => {
          setIsProcessing(true);
          setPaypalError('');
          try {
            // Calculate totals properly as numbers
            const cartSubtotal = parseFloat(getTotal()) || 0;
            const shippingCost = cartSubtotal > 100 ? 0 : 12.99;
            const taxAmount = cartSubtotal * 0.20;
            const finalTotal = cartSubtotal + shippingCost + taxAmount;
            
            console.log('PayPal Order Data:', {
              cartSubtotal,
              shippingCost,
              taxAmount,
              finalTotal,
              cartItems: getCartItemsForAPI()
            });
            
            const orderItems = getCartItemsForAPI().map(item => ({
              name: item.product_name,
              price: parseFloat(item.product_real_price) || 0,
              quantity: parseInt(item.quantity) || 1
            }));
            
            const { data, error: apiError } = await createPayPalOrder({ 
              items: orderItems, 
              total: finalTotal 
            });
            
            if (apiError || !data?.id) {
              throw new Error(data?.error || 'Failed to create order.');
            }
            return data.id;
          } catch (e) {
            console.error('PayPal Create Order Error:', e);
            setPaypalError(e.message || 'Failed to create PayPal order');
            setIsProcessing(false);
            return null;
          }
        },
        onApprove: async (data) => {
          try {
            const { data: captureData, error: captureError } = await capturePayPalOrder({ 
              orderID: data.orderID, 
              cartItems: getCartItemsForAPI() 
            });
            
            if (captureError) {
              throw new Error(captureError.message || 'Payment capture failed.');
            }
            
            setIsProcessing(false);
            setOrderComplete(true);
            setCompletedOrderId(captureData.orderId);
            clearCart();
          } catch (e) {
            console.error('PayPal Capture Error:', e);
            setPaypalError(e.message || 'Payment capture failed');
            setIsProcessing(false);
          }
        },
        onError: (err) => {
          console.error('PayPal Error:', err);
          setPaypalError('An error occurred with the PayPal transaction. Please try again.');
          setIsProcessing(false);
        },
        onCancel: () => {
          setIsProcessing(false);
        }
      }).render('#paypal-checkout-buttons');
    }
  }, [getCartItemsForAPI, clearCart, getTotal]);

  const loadPayPalScript = useCallback(async () => {
    setPaypalError('');
    const paypalContainer = document.getElementById('paypal-checkout-buttons');
    if (!paypalContainer) return;

    if (paypalButtonsRendered.current) {
        // If buttons are already rendered, no need to reload script
        // This might happen if component re-renders but paypal script is already there
        return;
    }

    paypalContainer.innerHTML = '<div class="flex justify-center items-center gap-2 text-center p-4"><div class="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div><span>Loading Payment Options...</span></div>';

    try {
      const { data: clientIdData, error: clientIdError } = await getPayPalClientId();
      if (clientIdError || !clientIdData?.clientId) {
        throw new Error(clientIdData?.error || 'Could not load payment provider. Please try again later.');
      }

      // Check if PayPal SDK script is already loaded
      if (window.paypal && document.getElementById('paypal-checkout-script')) {
        renderPayPalButtons();
        return;
      }

      const script = document.createElement('script');
      script.id = 'paypal-checkout-script';
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientIdData.clientId}&currency=GBP&intent=capture`;
      script.onload = () => {
        renderPayPalButtons();
      };
      script.onerror = () => {
        setPaypalError('Failed to load payment system. Please refresh and try again.');
        if (paypalContainer) {
          paypalContainer.innerHTML = `<div class="text-red-600 text-center p-4">Failed to load payment system.</div>`;
        }
      };
      document.body.appendChild(script);

    } catch (e) {
      setPaypalError(e.message);
      if (paypalContainer) {
        paypalContainer.innerHTML = `<div class="text-red-600 text-center p-4">${e.message}</div>`;
      }
    }
  }, [renderPayPalButtons]);

  // Load PayPal when component mounts and cart is ready
  useEffect(() => {
    if (!userLoading && !cartLoading && cart.length > 0 && !orderComplete) {
      loadPayPalScript();
    }
    // Clean up function to reset paypalButtonsRendered ref if component unmounts or cart empties
    return () => {
      if (cart.length === 0) {
        paypalButtonsRendered.current = false;
        const paypalContainer = document.getElementById('paypal-checkout-buttons');
        if (paypalContainer) paypalContainer.innerHTML = '';
      }
    };
  }, [userLoading, cartLoading, cart.length, orderComplete, loadPayPalScript]);

  if (userLoading || cartLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#5a3217] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="main-text">Loading Checkout...</p>
        </div>
      </div>
    );
  }

  // Handle immediate redirect after loading
  if (!user || (cart.length === 0 && !orderComplete)) {
    return null; // useEffect will handle the navigation
  }

  // Order Complete Success State
  if (orderComplete) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="max-w-3xl mx-auto p-6 flex items-center justify-center min-h-screen">
          <Card className="tool-card-bg border-0 elegant-shadow text-center p-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold main-text mb-4">Order Complete!</h1>
            <p className="text-lg main-text mb-6">
              Thank you for your order. You will receive a confirmation email shortly.
            </p>
            {completedOrderId && (
              <p className="text-sm main-text opacity-70 mb-6">
                Order ID: <span className="font-bold">{completedOrderId}</span>
              </p>
            )}
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => navigate(createPageUrl('Shop'))}
                style={{ backgroundColor: '#007e81', color: 'white' }}
              >
                Continue Shopping
              </Button>
              <Button
                onClick={() => navigate(createPageUrl('Home'))}
                variant="outline"
              >
                Back to Home
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e5e4cd' }}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl('Shop'))}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shop
          </Button>
          <div>
            <h1 className="font-abolition text-4xl text-[#5a3217]">Checkout</h1>
            <p className="text-sm text-[#5a3217] opacity-70">
              {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Shipping & Payment Info */}
          <div className="lg:col-span-2 space-y-6">

            {/* Shipping Information */}
            <Card className="tool-card-bg border-0 elegant-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 main-text">
                  <Truck className="w-5 h-5" />
                  Shipping Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="main-text">First Name *</Label>
                    <Input
                      id="firstName"
                      value={shippingInfo.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="bg-white/80"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="main-text">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={shippingInfo.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="bg-white/80"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email" className="main-text">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={shippingInfo.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="bg-white/80"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="main-text">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={shippingInfo.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="bg-white/80"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address" className="main-text">Address *</Label>
                  <Input
                    id="address"
                    value={shippingInfo.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="bg-white/80"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city" className="main-text">City *</Label>
                    <Input
                      id="city"
                      value={shippingInfo.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="bg-white/80"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state" className="main-text">County/State</Label>
                    <Input
                      id="state"
                      value={shippingInfo.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="bg-white/80"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode" className="main-text">Postal Code *</Label>
                    <Input
                      id="zipCode"
                      value={shippingInfo.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      className="bg-white/80"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="country" className="main-text">Country *</Label>
                  <Select value={shippingInfo.country} onValueChange={(value) => handleInputChange('country', value)}>
                    <SelectTrigger className="bg-white/80">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                      <SelectItem value="DE">Germany</SelectItem>
                      <SelectItem value="FR">France</SelectItem>
                      <SelectItem value="IT">Italy</SelectItem>
                      <SelectItem value="ES">Spain</SelectItem>
                      <SelectItem value="NL">Netherlands</SelectItem>
                      <SelectItem value="IE">Ireland</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="orderNotes" className="main-text">Order Notes (Optional)</Label>
                  <Textarea
                    id="orderNotes"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Any special instructions for your order..."
                    className="bg-white/80"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card className="tool-card-bg border-0 elegant-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 main-text">
                  <CreditCard className="w-5 h-5" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paypalError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <p className="font-medium">Payment Error</p>
                    <p className="text-sm">{paypalError}</p>
                  </div>
                )}

                <div id="paypal-checkout-buttons" className="min-h-[60px]">
                  {/* PayPal buttons will be rendered here by the SDK */}
                </div>

                {isProcessing && (
                  <div className="flex items-center justify-center gap-2 p-4 bg-white/50 rounded-lg mt-4">
                    <Loader2 className="w-5 h-5 animate-spin main-text" />
                    <span className="main-text">Processing your payment...</span>
                  </div>
                )}
                {!isProcessing && !paypalError && cart.length > 0 && !paypalButtonsRendered.current && (
                   <div className="flex justify-center items-center gap-2 text-center p-4">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading Payment Options...</span>
                   </div>
                )}
                {cart.length === 0 && !orderComplete && (
                  <div className="bg-white/50 p-4 rounded-lg text-center main-text">
                    Your cart is empty. Please add items to proceed with payment.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            <Card className="tool-card-bg border-0 elegant-shadow sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 main-text">
                  <ShoppingCart className="w-5 h-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-3">
                  {cart.length === 0 && !orderComplete ? (
                    <p className="main-text text-center text-sm opacity-70">Your cart is empty.</p>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                        <img
                          src={item.product_image_url}
                          alt={item.product_name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium main-text text-sm">{item.product_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              className="w-8 h-8 p-0"
                              disabled={isProcessing}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center text-sm main-text">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              className="w-8 h-8 p-0"
                              disabled={isProcessing}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeFromCart(item.id)}
                              className="w-8 h-8 p-0 ml-2"
                              disabled={isProcessing}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold main-text">£{(item.product_real_price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Separator />

                {/* Order Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between main-text">
                    <span>Subtotal</span>
                    <span>£{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between main-text">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? 'Free' : `£${shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between main-text">
                    <span>VAT (20%)</span>
                    <span>£{tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg main-text">
                    <span>Total</span>
                    <span>£{total.toFixed(2)}</span>
                  </div>
                </div>

                <p className="text-xs main-text opacity-70 text-center">
                  Free shipping on orders over £100
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
