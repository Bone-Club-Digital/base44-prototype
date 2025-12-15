import React, { useState, useEffect } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Order } from '@/entities/Order';
import { OrderItem } from '@/entities/OrderItem';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MyOrdersPage() {
  const { user, loading: userLoading } = useUser();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [orderList, orderItemList] = await Promise.all([
          Order.filter({ user_id: user.id }, '-created_date'),
          OrderItem.filter({ user_id: user.id })
        ]);

        const itemsByOrderId = orderItemList.reduce((acc, item) => {
          if (!acc[item.order_id]) {
            acc[item.order_id] = [];
          }
          acc[item.order_id].push(item);
          return acc;
        }, {});

        const ordersWithItems = orderList.map(order => ({
          ...order,
          items: itemsByOrderId[order.id] || []
        }));

        setOrders(ordersWithItems);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!userLoading) {
      fetchOrders();
    }
  }, [user, userLoading]);

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center p-16" style={{ backgroundColor: '#e5e4cd', minHeight: 'calc(100vh - 200px)' }}>
        <RefreshCw className="w-12 h-12 animate-spin main-text" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8" style={{ backgroundColor: '#e5e4cd' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-abolition text-4xl sm:text-5xl text-[#5a3217]">My Orders</h1>
          <p className="main-text mt-2">View your order history and details.</p>
        </div>

        {orders.length === 0 ? (
          <div className="text-center p-16 main-text tool-card-bg border-0 elegant-shadow rounded-lg">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold mb-2">No Orders Found</h2>
            <p className="mb-6">You haven't placed any orders yet.</p>
            <Link to={createPageUrl('Shop')}>
              <Button style={{ backgroundColor: '#f26222', color: 'white' }}>
                Start Shopping
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map(order => (
              <Card key={order.id} className="tool-card-bg border-0 elegant-shadow">
                <CardHeader className="flex flex-row items-start justify-between bg-white/20 p-4 rounded-t-lg">
                  <div>
                    <CardTitle className="main-text text-lg">Order #{order.id.slice(-8)}</CardTitle>
                    <p className="text-sm main-text opacity-70">
                      Placed on {new Date(order.created_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge 
                      className="capitalize"
                      style={order.status === 'completed' ? { backgroundColor: '#22c55e', color: 'white' } : {}}
                    >
                      {order.status}
                    </Badge>
                    <p className="font-bold main-text text-lg mt-1">
                      £{order.total_amount.toFixed(2)}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {order.items.map(item => (
                      <div key={item.id} className="flex items-center gap-4">
                        <img 
                          src={item.product_image_url} 
                          alt={item.product_name} 
                          className="w-16 h-16 object-cover rounded-md bg-white"
                        />
                        <div className="flex-grow">
                          <p className="font-semibold main-text">{item.product_name}</p>
                          <p className="text-sm main-text opacity-70">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <p className="font-semibold main-text">
                          £{(item.price_per_item * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
                {order.transaction_id && (
                  <CardFooter className="bg-white/20 p-3 rounded-b-lg">
                    <p className="text-xs main-text opacity-60">
                      Transaction ID: {order.transaction_id}
                    </p>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}