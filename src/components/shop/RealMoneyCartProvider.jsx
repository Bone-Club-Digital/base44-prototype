import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { RealMoneyCartItem } from '@/entities/RealMoneyCartItem';
import { useUser } from '../auth/UserProvider';

const RealMoneyCartContext = createContext();

export const useRealMoneyCart = () => {
  const context = useContext(RealMoneyCartContext);
  if (!context) {
    throw new Error('useRealMoneyCart must be used within a RealMoneyCartProvider');
  }
  return context;
};

export const RealMoneyCartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCartItems([]);
      return;
    }

    setLoading(true);
    try {
      const items = await RealMoneyCartItem.filter({ user_id: user.id });
      setCartItems(items);
    } catch (error) {
      if (error.response?.status === 429) {
        console.warn('[RealMoneyCartProvider] Rate limited, keeping existing cart data');
        // Don't clear cart on rate limit
      } else {
        console.warn('[RealMoneyCartProvider] Error loading cart:', error.message);
        setCartItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Only fetch when explicitly needed
  useEffect(() => {
    if (user && window.location.pathname.includes('Shop')) {
      fetchCart();
    }
  }, [user, fetchCart]);

  const addToCart = useCallback(async (product) => {
    if (!user) return;

    try {
      const existingItem = cartItems.find(item => item.product_id === product.id);
      
      if (existingItem) {
        const updatedItem = await RealMoneyCartItem.update(existingItem.id, {
          quantity: existingItem.quantity + 1
        });
        setCartItems(currentCart =>
          currentCart.map(item => 
            item.id === existingItem.id ? updatedItem : item
          )
        );
      } else {
        const newItem = await RealMoneyCartItem.create({
          user_id: user.id,
          product_id: product.id,
          product_name: product.name,
          product_real_price: product.real_price,
          product_image_url: product.image_url,
          quantity: 1
        });
        setCartItems(currentCart => [...currentCart, newItem]);
      }
    } catch (error) {
      if (error.response?.status === 429) {
        console.warn('Rate limited adding to cart, please try again in a moment.');
      } else {
        console.error('Error adding to cart:', error);
      }
    }
  }, [user, cartItems]);

  const removeFromCart = useCallback(async (itemId) => {
    try {
      await RealMoneyCartItem.delete(itemId);
      setCartItems(currentCart => currentCart.filter(item => item.id !== itemId));
    } catch (error) {
      if (error.response?.status === 429) {
        console.warn('Rate limited removing from cart, please try again in a moment.');
      } else {
        console.error('Error removing from cart:', error);
      }
    }
  }, []); 

  const updateQuantity = useCallback(async (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    try {
      const updatedItem = await RealMoneyCartItem.update(itemId, {
        quantity: newQuantity
      });
      setCartItems(currentCart =>
        currentCart.map(item => 
          item.id === itemId ? updatedItem : item
        )
      );
    } catch (error) {
      if (error.response?.status === 429) {
        console.warn('Rate limited updating cart quantity, please try again in a moment.');
      } else {
        console.error('Error updating quantity:', error);
      }
    }
  }, [removeFromCart]); 

  const clearCart = useCallback(async () => {
    if (!user) return;
    try {
      await Promise.all(cartItems.map(item => RealMoneyCartItem.delete(item.id)));
      setCartItems([]);
    } catch (error) {
      if (error.response?.status === 429) {
        console.warn('Rate limited clearing cart, please try again in a moment.');
      } else {
        console.error('Error clearing cart:', error);
      }
    }
  }, [user, cartItems]);

  const getTotal = useCallback(() => {
    return cartItems.reduce((total, item) => total + (item.product_real_price * item.quantity), 0);
  }, [cartItems]);

  const getTotalItems = useCallback(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const getCartItemsForAPI = useCallback(() => {
    return cartItems.map(item => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_real_price: item.product_real_price,
      quantity: item.quantity
    }));
  }, [cartItems]);

  const value = useMemo(() => ({
    cart: cartItems,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotal,
    getTotalItems,
    getCartItemsForAPI
  }), [cartItems, loading, addToCart, removeFromCart, updateQuantity, clearCart, getTotal, getTotalItems, getCartItemsForAPI]);

  return (
    <RealMoneyCartContext.Provider value={value}>
      {children}
    </RealMoneyCartContext.Provider>
  );
};