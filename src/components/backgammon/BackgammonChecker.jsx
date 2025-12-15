
import React from "react";

export default function BackgammonChecker({ color, index, isClickable, onClick, isDragging, style, size }) {
  const checkerImageUrl = color === 'bone' 
    ? 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b42fb72_bone_check3.png'
    : 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/4a52b11c4_teal_1.png';

  // Use the size prop for dynamic styling. Fallback to 100% width to fill its container.
  const dynamicSizeStyle = size 
    ? { width: `${size}px`, height: `${size}px` } 
    : { width: '100%', height: '100%' };

  return (
    <div
      className={`rounded-full cursor-pointer transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-110' : ''
      } ${isClickable ? 'hover:scale-105 hover:shadow-lg' : ''}`}
      onClick={onClick}
      style={{
        ...dynamicSizeStyle,
        backgroundImage: `url(${checkerImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        ...style
      }}
    />
  );
}
