import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function DoubleOfferModal({ isOpen, onTake, onPass, value }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="p-8 rounded-lg shadow-2xl text-center"
            style={{ backgroundColor: '#e5e4cd' }}
          >
            <h2 className="text-3xl font-bold mb-2" style={{ color: '#5a3217' }}>Double Offered!</h2>
            <p className="text-lg mb-6" style={{ color: '#5a3217' }}>
              Your opponent has doubled the stakes to <strong className="highlight-text">{value}</strong> points.
            </p>
            <div className="flex justify-center gap-4">
              <Button 
                onClick={onTake} 
                className="text-lg px-8 py-6"
                style={{ backgroundColor: '#007e81', color: 'white' }}
              >
                Take
              </Button>
              <Button 
                onClick={onPass} 
                variant="destructive" 
                className="text-lg px-8 py-6"
              >
                Pass
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}