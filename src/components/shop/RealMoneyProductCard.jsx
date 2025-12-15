import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useRealMoneyCart } from './RealMoneyCartProvider';
import { useUser } from '../auth/UserProvider';

export default function RealMoneyProductCard({ product }) {
  const { addToCart } = useRealMoneyCart();
  const { user } = useUser();
  
  if (!product) return null;

  const hasRealPrice = product.real_price && product.real_price > 0;
  const isLoggedIn = !!user;

  const handleAddToCart = () => {
    if (!isLoggedIn) {
      alert('Please log in to add items to cart.');
      return;
    }
    if (!hasRealPrice) {
      alert('This product is not available for real money purchase.');
      return;
    }
    addToCart(product);
  };

  return (
    <Card className="tool-card-bg border-0 elegant-shadow overflow-hidden flex flex-col group">
      <div className="overflow-hidden">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardContent className="p-4 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-lg main-text truncate">{product.name}</h3>
          <p className="text-sm main-text opacity-70 h-10 overflow-hidden">{product.description}</p>
        </div>
        <div className="flex justify-between items-center mt-4">
           {isLoggedIn ? (
            <div className="flex items-center gap-1">
              <span className="font-bold text-xl highlight-text">
                {hasRealPrice ? `£${product.real_price.toFixed(2)}` : 'N/A'}
              </span>
            </div>
          ) : (
            <div className="text-sm main-text opacity-70">Log in to see price</div>
          )}
          <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={!isLoggedIn || !hasRealPrice}
            style={{ 
              backgroundColor: (!isLoggedIn || !hasRealPrice) ? 'rgba(0, 126, 129, 0.5)' : '#007e81', 
              color: 'white',
              opacity: (!isLoggedIn || !hasRealPrice) ? 0.6 : 1
            }}
            className="hover:opacity-90 transition-opacity"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {!isLoggedIn ? 'Login to Purchase' : !hasRealPrice ? 'Not Available' : 'Add to Cart'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}