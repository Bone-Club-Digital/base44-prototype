import React, { useState, useEffect } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Order } from '@/entities/Order';
import { OrderItem } from '@/entities/OrderItem';
import { User } from '@/entities/User';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Package, 
  Eye,
  RefreshCw,
  DollarSign,
  ShoppingCart
} from 'lucide-react';
import { format } from 'date-fns';

export default function AdminOrdersPage() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const ordersPerPage = 20;

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate(createPageUrl('Home'));
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchOrdersData();
    }
  }, [user]);

  const fetchOrdersData = async () => {
    setOrdersLoading(true);
    try {
      const [orderList, userList, orderItemList] = await Promise.all([
        Order.list('-created_date'),
        User.list(),
        OrderItem.list()
      ]);

      // Create user lookup map
      const userMap = {};
      userList.forEach(u => {
        userMap[u.id] = u;
      });

      // Group order items by order_id
      const itemsByOrderId = {};
      orderItemList.forEach(item => {
        if (!itemsByOrderId[item.order_id]) {
          itemsByOrderId[item.order_id] = [];
        }
        itemsByOrderId[item.order_id].push(item);
      });

      // Enrich orders with user info and items
      const enrichedOrders = orderList.map(order => ({
        ...order,
        user: userMap[order.user_id] || { full_name: 'Unknown User', email: 'unknown@email.com' },
        items: itemsByOrderId[order.id] || []
      }));

      setOrders(enrichedOrders);
      setUsers(userList);
      setOrderItems(orderItemList);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await Order.update(orderId, { status: newStatus });
      await fetchOrdersData();
      alert('Order status updated successfully!');
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status. Please try again.');
    }
  };

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  // Filter and search logic
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const currentOrders = filteredOrders.slice(startIndex, startIndex + ordersPerPage);

  // Calculate statistics
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
  const completedOrders = orders.filter(order => order.status === 'completed').length;
  const pendingOrders = orders.filter(order => order.status === 'pending').length;

  if (loading || ordersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 main-text" />
          <p className="main-text">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to={createPageUrl("Admin")} className="flex items-center gap-2 hover:opacity-70 transition-colors" style={{ color: '#5a3217' }}>
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Admin</span>
          </Link>
          <Button
            onClick={fetchOrdersData}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        <h1 className="text-4xl font-bold main-text mb-8">Order Management</h1>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="tool-card-bg border-0 elegant-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium main-text opacity-70">Total Orders</p>
                  <p className="text-2xl font-bold main-text">{orders.length}</p>
                </div>
                <Package className="w-8 h-8 main-text opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="tool-card-bg border-0 elegant-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium main-text opacity-70">Total Revenue</p>
                  <p className="text-2xl font-bold main-text">£{totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 main-text opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="tool-card-bg border-0 elegant-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium main-text opacity-70">Completed</p>
                  <p className="text-2xl font-bold main-text">{completedOrders}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <Package className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="tool-card-bg border-0 elegant-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium main-text opacity-70">Pending</p>
                  <p className="text-2xl font-bold main-text">{pendingOrders}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
                  <Package className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="tool-card-bg border-0 elegant-shadow mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Search by customer name, email, order ID, or transaction ID..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 text-sm main-text opacity-70">
              Showing {startIndex + 1}-{Math.min(startIndex + ordersPerPage, filteredOrders.length)} of {filteredOrders.length} orders
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="tool-card-bg border-0 elegant-shadow mb-6">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/20">
                  <tr>
                    <th className="text-left p-4 main-text font-semibold">Order</th>
                    <th className="text-left p-4 main-text font-semibold">Customer</th>
                    <th className="text-left p-4 main-text font-semibold">Date</th>
                    <th className="text-left p-4 main-text font-semibold">Amount</th>
                    <th className="text-left p-4 main-text font-semibold">Status</th>
                    <th className="text-left p-4 main-text font-semibold">Items</th>
                    <th className="text-left p-4 main-text font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrders.map((order, index) => (
                    <tr key={order.id} className={index % 2 === 0 ? 'bg-white/10' : 'bg-transparent'}>
                      <td className="p-4">
                        <div>
                          <p className="font-semibold main-text">#{order.id.slice(-8)}</p>
                          <p className="text-xs main-text opacity-70">{order.transaction_id}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-semibold main-text">{order.user.full_name}</p>
                          <p className="text-sm main-text opacity-70">{order.user.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm main-text">
                          {format(new Date(order.created_date), 'dd MMM yyyy')}
                        </p>
                        <p className="text-xs main-text opacity-70">
                          {format(new Date(order.created_date), 'HH:mm')}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold main-text">£{order.total_amount.toFixed(2)}</p>
                        <p className="text-xs main-text opacity-70">{order.currency}</p>
                      </td>
                      <td className="p-4">
                        <Badge 
                          className="capitalize"
                          style={
                            order.status === 'completed' 
                              ? { backgroundColor: '#22c55e', color: 'white' }
                              : order.status === 'pending'
                              ? { backgroundColor: '#eab308', color: 'white' }
                              : { backgroundColor: '#ef4444', color: 'white' }
                          }
                        >
                          {order.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <p className="text-sm main-text">{order.items.length} items</p>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => viewOrderDetails(order)}
                            variant="outline"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Select
                            value={order.status}
                            onValueChange={(newStatus) => handleStatusUpdate(order.id, newStatus)}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card className="tool-card-bg border-0 elegant-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-10 h-8"
                        style={currentPage === pageNum ? { backgroundColor: '#5a3217', color: '#e5e4cd' } : {}}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {currentOrders.length === 0 && (
          <Card className="tool-card-bg border-0 elegant-shadow text-center py-12">
            <CardContent>
              <ShoppingCart className="w-16 h-16 main-text opacity-50 mx-auto mb-4" />
              <h3 className="text-xl font-bold main-text mb-2">No Orders Found</h3>
              <p className="main-text opacity-70">
                {searchTerm || statusFilter !== 'all' ? 'No orders match your current filters.' : 'No orders have been placed yet.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Order Details Modal */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="main-text">Order Details - #{selectedOrder?.id.slice(-8)}</DialogTitle>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-6">
                {/* Order Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold main-text">Order Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="main-text opacity-70">Order ID:</span>
                        <span className="main-text font-mono">#{selectedOrder.id.slice(-8)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="main-text opacity-70">Transaction ID:</span>
                        <span className="main-text font-mono text-xs">{selectedOrder.transaction_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="main-text opacity-70">Date:</span>
                        <span className="main-text">{format(new Date(selectedOrder.created_date), 'dd MMM yyyy HH:mm')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="main-text opacity-70">Payment Provider:</span>
                        <span className="main-text capitalize">{selectedOrder.payment_provider}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="main-text opacity-70">Status:</span>
                        <Badge 
                          className="capitalize"
                          style={
                            selectedOrder.status === 'completed' 
                              ? { backgroundColor: '#22c55e', color: 'white' }
                              : selectedOrder.status === 'pending'
                              ? { backgroundColor: '#eab308', color: 'white' }
                              : { backgroundColor: '#ef4444', color: 'white' }
                          }
                        >
                          {selectedOrder.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold main-text">Customer Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="main-text opacity-70">Name:</span>
                        <span className="main-text">{selectedOrder.user.full_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="main-text opacity-70">Email:</span>
                        <span className="main-text">{selectedOrder.user.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="main-text opacity-70">Username:</span>
                        <span className="main-text">{selectedOrder.user.username || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="font-semibold main-text mb-4">Order Items</h4>
                  <div className="space-y-3">
                    {selectedOrder.items.map(item => (
                      <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-100 rounded-lg">
                        <div className="w-16 h-16 bg-white rounded-md overflow-hidden">
                          <img 
                            src={item.product_image_url || '/api/placeholder/64/64'} 
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-grow">
                          <p className="font-semibold main-text">{item.product_name}</p>
                          <p className="text-sm main-text opacity-70">
                            £{item.price_per_item.toFixed(2)} × {item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold main-text">
                            £{(item.price_per_item * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold main-text">Total Amount:</span>
                      <span className="font-bold text-lg main-text">£{selectedOrder.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Status Update */}
                <div className="flex items-center gap-4 pt-4 border-t border-gray-300">
                  <span className="main-text">Update Status:</span>
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(newStatus) => {
                      handleStatusUpdate(selectedOrder.id, newStatus);
                      setSelectedOrder({...selectedOrder, status: newStatus});
                    }}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}