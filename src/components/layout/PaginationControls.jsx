import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PaginationControls({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems, noun = "items" }) {
  if (totalPages <= 1) return null;
  
  const startIndex = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between mt-4 border-t border-white/20 pt-4">
      <p className="text-sm main-text opacity-70">
        Showing {startIndex}-{endIndex} of {totalItems} {noun}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        <span className="text-sm main-text font-medium px-2">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}