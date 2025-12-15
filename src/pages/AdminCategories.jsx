
import React, { useState, useEffect } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Category } from '@/entities/Category';
import { Product } from '@/entities/Product';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Trash2, Save, X, LayoutGrid, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function AdminCategoriesPage() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '' });
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showProductManager, setShowProductManager] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null); // This state might be less crucial now but can remain for context

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate(createPageUrl('Home'));
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [categoryList, productList] = await Promise.all([
        Category.list(),
        Product.list()
      ]);
      setCategories(categoryList);
      setProducts(productList);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '' });
    setEditingCategory(null);
  };

  const handleEdit = (category) => {
    setFormData({ name: category.name });
    setEditingCategory(category.id);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Category name cannot be empty.');
      return;
    }
    
    // Check for duplicate names
    const existingCategory = categories.find(cat => 
      cat.name.toLowerCase() === formData.name.trim().toLowerCase() && 
      cat.id !== editingCategory
    );
    
    if (existingCategory) {
      alert('A category with this name already exists.');
      return;
    }

    try {
      if (editingCategory) {
        await Category.update(editingCategory, { name: formData.name.trim() });
      } else {
        await Category.create({ name: formData.name.trim() });
      }
      await fetchData();
      resetForm();
      alert(editingCategory ? 'Category updated!' : 'Category created!');
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category.');
    }
  };

  const handleDelete = async (categoryId, categoryName) => {
    const productsInCategory = products.filter(p => 
      (p.categories && p.categories.includes(categoryName)) || 
      p.category === categoryName // Check for backward compatibility with single category field
    );
    
    if (productsInCategory.length > 0) {
      alert(`Cannot delete category "${categoryName}" because it contains ${productsInCategory.length} product(s). Please remove the products from this category first.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the category "${categoryName}"?`)) return;
    
    try {
      await Category.delete(categoryId);
      await fetchData();
      alert('Category deleted!');
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category.');
    }
  };

  const getProductsInCategory = (categoryName) => {
    return products.filter(p => 
      (p.categories && p.categories.includes(categoryName)) || 
      (!p.categories && p.category === categoryName) // Backward compatibility
    );
  };

  const getUncategorizedProducts = () => {
    return products.filter(p => 
      (!p.categories || p.categories.length === 0) && 
      !p.category // Consider old single category field as well
    );
  };

  const toggleCategoryExpansion = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const handleManageProducts = (category) => {
    setSelectedCategory(category); // Keep selected category for potential future use if needed, though not directly used in the new Product Manager view
    setShowProductManager(true);
  };

  const handleToggleProductCategory = async (productId, categoryName, isChecked) => {
    try {
      const product = products.find(p => p.id === productId);
      let updatedCategories = Array.isArray(product.categories) ? [...product.categories] : [];
      
      if (isChecked) {
        // Add category if not already present
        if (!updatedCategories.includes(categoryName)) {
          updatedCategories.push(categoryName);
        }
      } else {
        // Remove category
        updatedCategories = updatedCategories.filter(cat => cat !== categoryName);
      }
      
      // Update product with new categories array and maintain backward compatibility for single 'category' field
      await Product.update(productId, { 
        categories: updatedCategories,
        category: updatedCategories.length > 0 ? updatedCategories[0] : null // Assign first category for old field
      });
      
      await fetchData(); // Re-fetch data to update UI
    } catch (error) {
      console.error('Error updating product categories:', error);
      alert('Failed to update product categories.');
    }
  };

  if (loading || categoriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="w-12 h-12 border-4 border-[#5a3217] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showProductManager) {
    return (
      <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="max-w-6xl mx-auto">
          <Button 
            onClick={() => setShowProductManager(false)} 
            className="flex items-center gap-2 mb-8 hover:opacity-70" 
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Categories
          </Button>

          <h1 className="text-4xl font-bold main-text mb-8">
            Manage Product Categories
          </h1>

          {/* All Products with Category Checkboxes */}
          <div className="space-y-6">
            {products.map(product => {
              // Ensure productCategories is always an array, handling old 'category' string for backward compatibility
              const productCategories = Array.isArray(product.categories) 
                ? product.categories 
                : (product.category ? [product.category] : []);
              
              return (
                <Card key={product.id} className="tool-card-bg border-0 elegant-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                      />
                      
                      <div className="flex-grow min-w-0">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-lg main-text">{product.name}</h3>
                            <p className="text-sm main-text opacity-70 mt-1">{product.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              {product.price > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {product.price} 🦴
                                </Badge>
                              )}
                              {product.real_price > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  ${product.real_price}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold main-text mb-3">Categories:</h4>
                          {categories.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {categories.map(category => (
                                <label 
                                  key={category.id} 
                                  className="flex items-center gap-2 p-2 rounded-lg bg-white/30 hover:bg-white/50 cursor-pointer transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={productCategories.includes(category.name)}
                                    onChange={(e) => handleToggleProductCategory(
                                      product.id, 
                                      category.name, 
                                      e.target.checked
                                    )}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm main-text font-medium">
                                    {category.name}
                                  </span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm main-text opacity-70 italic">No categories available. Please create categories first.</p>
                          )}
                          
                          {productCategories.length === 0 && (
                            <p className="text-sm text-orange-600 mt-2 italic">
                              ⚠️ This product is not assigned to any categories
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {products.length === 0 && (
            <Card className="tool-card-bg border-0 elegant-shadow text-center py-12">
              <CardContent>
                <Package className="w-16 h-16 main-text opacity-50 mx-auto mb-4" />
                <h3 className="text-xl font-bold main-text mb-2">No Products Found</h3>
                <p className="main-text opacity-70">Create some products first to manage their categories.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to={createPageUrl("Admin")} className="flex items-center gap-2 hover:opacity-70" style={{ color: '#5a3217' }}>
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Admin</span>
          </Link>
          <Button
            onClick={() => setShowProductManager(true)}
            style={{ backgroundColor: '#f26222', color: 'white' }}
            className="flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            Manage Product Categories
          </Button>
        </div>

        <h1 className="text-4xl font-bold main-text mb-8">Category Management</h1>

        <Card className="tool-card-bg border-0 elegant-shadow mb-8">
          <CardHeader>
            <CardTitle className="main-text">{editingCategory ? 'Edit Category' : 'Create New Category'}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ name: e.target.value })}
              placeholder="Enter category name"
              className="flex-grow"
              onKeyPress={(e) => e.key === 'Enter' && handleSave()}
            />
            <Button onClick={handleSave} style={{ backgroundColor: '#007e81', color: 'white' }}>
              <Save className="w-4 h-4 mr-2" />
              {editingCategory ? 'Update' : 'Save'}
            </Button>
            {editingCategory && (
              <Button onClick={resetForm} variant="outline">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {categories.map(category => {
            const categoryProducts = getProductsInCategory(category.name);
            const isExpanded = expandedCategories[category.id];
            
            return (
              <Card key={category.id} className="tool-card-bg border-0 elegant-shadow">
                <Collapsible>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <CollapsibleTrigger
                          onClick={() => toggleCategoryExpansion(category.id)}
                          className="flex items-center gap-2 hover:opacity-70"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 main-text" />
                          ) : (
                            <ChevronDown className="w-5 h-5 main-text" />
                          )}
                        </CollapsibleTrigger>
                        
                        <div>
                          <p className="font-bold main-text text-lg">{category.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                              style={{ borderColor: '#5a3217', color: '#5a3217' }}
                            >
                              <Package className="w-3 h-3 mr-1" />
                              {categoryProducts.length} products
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleManageProducts(category)}
                          className="flex items-center gap-1"
                        >
                          <Package className="w-3 h-3" />
                          Manage
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(category)}>
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => handleDelete(category.id, category.name)}
                          disabled={categoryProducts.length > 0} // Still disable if products are associated
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </Button>
                      </div>
                    </div>
                    
                    <CollapsibleContent className="mt-4">
                      {categoryProducts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 p-4 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
                          {categoryProducts.map(product => (
                            <div key={product.id} className="bg-white/50 p-3 rounded-lg">
                              <div className="flex items-start gap-3">
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                                <div className="flex-grow min-w-0">
                                  <h4 className="font-semibold main-text text-sm truncate">{product.name}</h4>
                                  <p className="text-xs main-text opacity-70 truncate">{product.description}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {product.price > 0 && (
                                      <Badge variant="secondary" className="text-xs">
                                        {product.price} 🦴
                                      </Badge>
                                    )}
                                    {product.real_price > 0 && (
                                      <Badge variant="secondary" className="text-xs">
                                        ${product.real_price}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 main-text opacity-70">
                          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No products in this category</p>
                        </div>
                      )}
                    </CollapsibleContent>
                  </CardContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
        
        {categories.length === 0 && (
          <Card className="tool-card-bg border-0 elegant-shadow text-center py-12">
            <CardContent>
              <LayoutGrid className="w-16 h-16 main-text opacity-50 mx-auto mb-4" />
              <h3 className="text-xl font-bold main-text mb-2">No Categories Yet</h3>
              <p className="main-text opacity-70 mb-4">Create your first product category to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
