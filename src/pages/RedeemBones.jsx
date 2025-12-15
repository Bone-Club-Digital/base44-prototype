
import React, { useState, useEffect } from 'react';
import { Product } from '@/entities/Product';
import { Category } from '@/entities/Category';
import { RefreshCw } from 'lucide-react';
import ProductCard from '../components/shop/ProductCard';
import CategoryFilter from '../components/shop/CategoryFilter';

export default function RedeemBonesPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [productList, categoryList] = await Promise.all([
            Product.list(),
            Category.list()
        ]);
        setProducts(productList.filter(p => p.price && p.price > 0));
        setCategories(categoryList.map(c => c.name));
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredProducts = activeCategory === 'All'
    ? products
    : products.filter(p => 
        (p.categories && p.categories.includes(activeCategory)) || 
        (!p.categories && p.category === activeCategory)
      );

  return (
    <div className="p-4 sm:p-8" style={{ backgroundColor: '#e5e4cd' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl text-[#5a3217]">Redeem Bones</h1>
          <p className="main-text mt-2">Use your earned Bones to get premium backgammon equipment.</p>
        </div>
        
        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
        />

        {loading ? (
          <div className="flex items-center justify-center p-16">
            <RefreshCw className="w-12 h-12 animate-spin main-text" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
        
        {(!loading && filteredProducts.length === 0) && (
             <div className="text-center p-16 main-text tool-card-bg border-0 elegant-shadow rounded-lg">
                <h2 className="text-2xl font-bold mb-2">No Products Found</h2>
                <p>There are no products available in the "{activeCategory}" category at the moment.</p>
            </div>
        )}
      </div>
    </div>
  );
}
