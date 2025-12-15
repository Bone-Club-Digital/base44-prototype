
import React, { useState, useEffect } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Product } from '@/entities/Product';
import { Category } from '@/entities/Category'; // Import Category entity
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const CATEGORIES = [
  "Backgammon Boards",
  "Backgammon Checkers",
  "Backgammon Doubling Cubes",
  "Backgammon Dice Cups",
  "Backgammon Dice"
];

export default function AdminProductsPage() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); // Add state for categories
  const [productsLoading, setProductsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '', // Bones price
    real_price: '', // New: Real money price
    category: '',
    image_url: '',
    sku: '',
    stock: '10',
    real_money_url: '' // New: Real money purchase URL
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate(createPageUrl('Home'));
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchData(); // Call fetchData instead of fetchProducts
    }
  }, [user]);

  const fetchData = async () => {
    setProductsLoading(true);
    try {
      const [productList, categoryList] = await Promise.all([
        Product.list(),
        Category.list()
      ]);
      setProducts(productList);
      setCategories(categoryList);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchProducts = async () => { // Keep for isolated refresh
    try {
      const productList = await Product.list();
      setProducts(productList);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      real_price: '', // Reset new field
      category: '',
      image_url: '',
      sku: '',
      stock: '10',
      real_money_url: '' // Reset new field
    });
    setEditingProduct(null);
    setIsCreating(false);
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      real_price: product.real_price ? product.real_price.toString() : '', // Populate new field
      category: product.category,
      image_url: product.image_url,
      sku: product.sku,
      stock: product.stock.toString(),
      real_money_url: product.real_money_url || '' // Populate new field
    });
    setEditingProduct(product.id);
    setIsCreating(false);
  };

  const handleCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleSave = async () => {
    try {
      const productData = {
        ...formData,
        price: parseInt(formData.price),
        stock: parseInt(formData.stock),
        real_price: formData.real_price ? parseFloat(formData.real_price) : null, // Parse real price to float, allow null
        real_money_url: formData.real_money_url === '' ? null : formData.real_money_url // Allow null for empty URL
      };

      if (editingProduct) {
        await Product.update(editingProduct, productData);
      } else {
        await Product.create(productData);
      }

      await fetchProducts(); // Use isolated product fetch here
      resetForm();
      alert(editingProduct ? 'Product updated successfully!' : 'Product created successfully!');
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product. Please try again.');
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await Product.delete(productId);
      await fetchProducts(); // Use isolated product fetch here
      alert('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    }
  };

  if (loading || productsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#5a3217] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="main-text">Loading products...</p>
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
            onClick={handleCreate}
            style={{ backgroundColor: '#f26222', color: 'white' }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </Button>
        </div>

        <h1 className="text-4xl font-bold main-text mb-8">Product Management</h1>

        {(isCreating || editingProduct) && (
          <Card className="tool-card-bg border-0 elegant-shadow mb-8">
            <CardHeader>
              <CardTitle className="main-text">
                {isCreating ? 'Create New Product' : 'Edit Product'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium main-text mb-2">Product Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium main-text mb-2">SKU</label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    placeholder="Enter SKU"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium main-text mb-2">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium main-text mb-2">Price (Bones)</label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium main-text mb-2">Real Price ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.real_price || ''}
                    onChange={(e) => setFormData({...formData, real_price: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium main-text mb-2">Stock</label>
                  <Input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium main-text mb-2">Category</label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium main-text mb-2">Image URL</label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium main-text mb-2">Real Money Purchase URL</label>
                <Input
                  value={formData.real_money_url || ''}
                  onChange={(e) => setFormData({...formData, real_money_url: e.target.value})}
                  placeholder="https://boneclub.com/product-link"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  style={{ backgroundColor: '#007e81', color: 'white' }}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Product
                </Button>
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => (
            <Card key={product.id} className="tool-card-bg border-0 elegant-shadow">
              <div className="overflow-hidden rounded-t-lg">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
              </div>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <h3 className="font-bold text-lg main-text truncate">{product.name}</h3>
                  <p className="text-sm main-text opacity-70">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {product.price > 0 && (
                        <>
                          <span className="font-bold text-lg highlight-text">{product.price}</span>
                          <span className="highlight-text">🦴</span>
                        </>
                      )}
                      {product.price > 0 && product.real_price > 0 && <span className="highlight-text mx-1">/</span>}
                      {product.real_price > 0 && (
                        <>
                          <span className="font-bold text-lg highlight-text">${product.real_price.toFixed(2)}</span>
                        </>
                      )}
                      {product.price === 0 && product.real_price === 0 && (
                        <span className="font-bold text-lg main-text opacity-70">Free</span>
                      )}
                    </div>
                    <Badge variant="outline">{product.category}</Badge>
                  </div>
                  <div className="text-xs main-text opacity-60">
                    SKU: {product.sku} | Stock: {product.stock}
                  </div>
                  {product.real_money_url && (
                    <a
                      href={product.real_money_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Buy with Real Money
                    </a>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      onClick={() => handleEdit(product)}
                      variant="outline"
                      className="flex items-center gap-1 flex-1"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                      variant="destructive"
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {products.length === 0 && (
          <Card className="tool-card-bg border-0 elegant-shadow text-center py-12">
            <CardContent>
              <Package className="w-16 h-16 main-text opacity-50 mx-auto mb-4" />
              <h3 className="text-xl font-bold main-text mb-2">No Products Yet</h3>
              <p className="main-text opacity-70 mb-4">Start by adding your first product to the shop.</p>
              <Button
                onClick={handleCreate}
                style={{ backgroundColor: '#f26222', color: 'white' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Product
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
