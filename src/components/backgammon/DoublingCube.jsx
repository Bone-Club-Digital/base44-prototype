import React from 'react';
import { motion } from 'framer-motion';

export default function DoublingCube({ value, onClick, disabled }) {
  const displayValue = value === 1 ? 64 : value;

  return (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.1 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={!disabled ? onClick : undefined}
      className={`aspect-square w-10 h-10 md:w-14 md:h-14 rounded-lg flex items-center justify-center font-bold text-xl md:text-2xl shadow-lg transition-all
        ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}
      `}
      style={{
        backgroundColor: '#e5e4cd',
        color: '#5a3217',
        textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
        opacity: 1
      }}
    >
      {displayValue}
    </motion.div>
  );
}