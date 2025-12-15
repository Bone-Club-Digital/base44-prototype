
import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, ZoomIn, ZoomOut, Move } from 'lucide-react';

export default function ImageCropModal({ isOpen, onClose, imageUrl, onCropComplete }) {
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [image, setImage] = useState(null);

  // Load image when URL changes
  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setImage(img);
        
        // Calculate initial size to be 50% of preview window width
        const canvasSize = 300;
        const targetWidth = canvasSize * 0.5; // 50% of canvas width
        
        // Scale image so its width is 50% of canvas
        const initialScale = (targetWidth / img.width) * 100; // Convert to percentage
        
        const scaledWidth = img.width * (initialScale / 100);
        const scaledHeight = img.height * (initialScale / 100);
        
        setScale(initialScale);
        setPosition({
          x: (canvasSize - scaledWidth) / 2,
          y: (canvasSize - scaledHeight) / 2
        });
      };
      img.src = imageUrl;
    }
  }, [imageUrl]);

  // Draw canvas
  useEffect(() => {
    if (!image) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const canvasSize = 300;
    const circleRadius = 140;

    canvas.width = canvasSize;
    canvas.height = canvasSize;
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Calculate scaled image dimensions
    const scaledWidth = image.width * (scale / 100);
    const scaledHeight = image.height * (scale / 100);

    // First, draw a dark background everywhere
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Create circular clipping path
    ctx.save();
    ctx.beginPath();
    ctx.arc(canvasSize / 2, canvasSize / 2, circleRadius, 0, Math.PI * 2);
    ctx.clip();

    // Clear the circle area (remove dark overlay)
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Draw the image at full opacity within the circle
    ctx.drawImage(image, position.x, position.y, scaledWidth, scaledHeight);

    ctx.restore();

    // Draw circle border
    ctx.strokeStyle = '#f26222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(canvasSize / 2, canvasSize / 2, circleRadius, 0, Math.PI * 2);
    ctx.stroke();
  }, [image, scale, position]);

  const handleMouseDown = (e) => {
    if (!image) return;
    setIsDragging(true);
    const rect = canvasRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left - position.x,
      y: e.clientY - rect.top - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !image) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left - dragStart.x,
      y: e.clientY - rect.top - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleScaleChange = (value) => {
    setScale(value[0]);
  };

  const handleReset = () => {
    if (!image) return;
    
    const canvasSize = 300;
    const targetWidth = canvasSize * 0.5; // 50% of canvas width
    
    const initialScale = (targetWidth / image.width) * 100;
    const scaledWidth = image.width * (initialScale / 100);
    const scaledHeight = image.height * (initialScale / 100);
    
    setScale(initialScale);
    setPosition({
      x: (canvasSize - scaledWidth) / 2,
      y: (canvasSize - scaledHeight) / 2
    });
  };

  const handleCropComplete = async () => {
    if (!image) return;
    
    setIsProcessing(true);
    try {
      const outputCanvas = document.createElement('canvas');
      const outputCtx = outputCanvas.getContext('2d');
      const outputSize = 400;
      outputCanvas.width = outputSize;
      outputCanvas.height = outputSize;

      // Calculate what portion of the image is visible in the circle
      const canvasSize = 300;
      const circleRadius = 140;
      const circleCenterX = canvasSize / 2;
      const circleCenterY = canvasSize / 2;

      // Current image dimensions on canvas
      const scaledWidth = image.width * (scale / 100);
      const scaledHeight = image.height * (scale / 100);

      // Calculate the visible area bounds
      const cropLeft = Math.max(0, circleCenterX - circleRadius - position.x);
      const cropTop = Math.max(0, circleCenterY - circleRadius - position.y);
      const cropRight = Math.min(scaledWidth, circleCenterX + circleRadius - position.x);
      const cropBottom = Math.min(scaledHeight, circleCenterY + circleRadius - position.y);

      const cropWidth = cropRight - cropLeft;
      const cropHeight = cropBottom - cropTop;

      // Map back to source image coordinates
      const sourceX = cropLeft / (scale / 100);
      const sourceY = cropTop / (scale / 100);
      const sourceWidth = cropWidth / (scale / 100);
      const sourceHeight = cropHeight / (scale / 100);

      // Draw the cropped portion to output canvas
      const outputScale = outputSize / Math.max(cropWidth, cropHeight);
      const outputX = (outputSize - cropWidth * outputScale) / 2;
      const outputY = (outputSize - cropHeight * outputScale) / 2;

      outputCtx.drawImage(
        image,
        sourceX, sourceY, sourceWidth, sourceHeight,
        outputX, outputY, cropWidth * outputScale, cropHeight * outputScale
      );

      // Apply circular mask
      outputCtx.globalCompositeOperation = 'destination-in';
      outputCtx.beginPath();
      outputCtx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      outputCtx.fill();

      outputCanvas.toBlob((blob) => {
        onCropComplete(blob);
      }, 'image/png', 0.9);

    } catch (error) {
      console.error('Error cropping image:', error);
      alert('Failed to crop image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]" style={{ backgroundColor: '#5a3217', color: '#e5e4cd' }}>
        <DialogHeader>
          <DialogTitle className="text-xl uppercase" style={{ color: '#e5e4cd' }}>
            Adjust Profile Picture
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={300}
              height={300}
              className="border-2 cursor-move"
              style={{ 
                width: '300px', 
                height: '300px',
                borderColor: '#f26222'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            {/* The img tag below is likely a remnant or misplacement if image state is used */}
            <img ref={imageRef => { if (imageRef) setImage(imageRef); }} src={imageUrl} style={{ display: 'none' }} alt="" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <ZoomOut className="w-4 h-4" style={{ color: '#e5e4cd' }} />
              <Slider
                value={[scale]}
                onValueChange={handleScaleChange}
                min={10}
                max={200}
                step={1}
                className="flex-1"
              />
              <ZoomIn className="w-4 h-4" style={{ color: '#e5e4cd' }} />
              <span className="text-sm w-12" style={{ color: '#e5e4cd' }}>{Math.round(scale)}%</span>
            </div>

            <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(229, 228, 205, 0.7)' }}>
              <Move className="w-4 h-4" />
              <span>Drag the image to reposition it</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            onClick={handleReset}
            className="flex items-center gap-2"
            style={{ 
                backgroundColor: '#e5e4cd',
                color: '#5a3217',
                border: '1px solid #5a3217'
            }}
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button 
            onClick={onClose}
            style={{ 
                backgroundColor: '#e5e4cd',
                color: '#5a3217',
                border: '1px solid #5a3217'
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCropComplete}
            disabled={isProcessing}
            style={{ backgroundColor: '#f26222', color: 'white' }}
          >
            {isProcessing ? 'Processing...' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
