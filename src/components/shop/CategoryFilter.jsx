import React from 'react';
import { Button } from '@/components/ui/button';

export default function CategoryFilter({ categories, activeCategory, onSelectCategory }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
      {['All', ...categories].map(category => (
        <Button
          key={category}
          variant={activeCategory === category ? 'default' : 'outline'}
          onClick={() => onSelectCategory(category)}
          style={activeCategory === category ? { backgroundColor: '#5a3217', color: '#e5e4cd' } : { borderColor: '#5a3217', color: '#5a3217' }}
          className="uppercase tracking-wider text-xs font-bold"
        >
          {category}
        </Button>
      ))}
    </div>
  );
}