
import React, { createContext, useState, useEffect, useContext } from 'react';
import { CartItem } from '@/entities/CartItem';
import { useUser } from '../auth/UserProvider';

const CartContext = createContext({ 
  cartItems: [], 
  loading: false, 
  addToCart: () => {}, 
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  getTotalPrice: () => 0,
  getTotalItems: () => 0,
  refetchCart: () => {}
});

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  const fetchCart = async () => {
    if (!user) {
      setCartItems([]);
      return;
    }

    setLoading(true);
    try {
      const items = await CartItem.filter({ user_id: user.id });
      setCartItems(items);
    } catch (error) {
      console.error('Error fetching cart:', error.message || error);
      // Don't clear cart on rate limit errors - keep existing state
      if (!error.message || !error.message.includes('429')) {
        setCartItems([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch cart when explicitly needed, not on every user change
    if (user && window.location.pathname.includes('RedeemBones')) {
      fetchCart();
    }
  }, [user]);

  const addToCart = async (product) => {
    if (!user) {
      alert('Please log in to add items to cart.');
      return;
    }

    try {
      // Check if item already exists in cart
      const existingItem = cartItems.find(item => item.product_id === product.id);
      
      if (existingItem) {
        // Update quantity
        await CartItem.update(existingItem.id, {
          quantity: existingItem.quantity + 1
        });
      } else {
        // Add new item
        await CartItem.create({
          user_id: user.id,
          product_id: product.id,
          quantity: 1,
          product_name: product.name,
          product_price: product.price,
          product_image_url: product.image_url
        });
      }
      
      await fetchCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add item to cart.');
    }
  };

  const removeFromCart = async (cartItemId) => {
    try {
      await CartItem.delete(cartItemId);
      await fetchCart();
    } catch (error) {
      console.error('Error removing from cart:', error);
      alert('Failed to remove item from cart.');
    }
  };

  const updateQuantity = async (cartItemId, newQuantity) => {
    if (newQuantity <= 0) {
      await removeFromCart(cartItemId);
      return;
    }

    try {
      await CartItem.update(cartItemId, { quantity: newQuantity });
      await fetchCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      alert('Failed to update quantity.');
    }
  };

  const clearCart = async () => {
    if (!user) return;
    
    try {
      for (const item of cartItems) {
        await CartItem.delete(item.id);
      }
      setCartItems([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
      alert('Failed to clear cart.');
    }
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.product_price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const value = {
    cartItems,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
    refetchCart: fetchCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
