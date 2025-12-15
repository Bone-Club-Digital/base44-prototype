import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Pipette } from 'lucide-react';

export default function ColorPickerModal({ isOpen, onClose, initialColor = '#6b7280', onColorSelect }) {
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [hexInput, setHexInput] = useState(initialColor);
  const [rgbInputs, setRgbInputs] = useState({ r: 107, g: 114, b: 128 });
  const [hslInputs, setHslInputs] = useState({ h: 210, s: 11, l: 46 });

  useEffect(() => {
    if (initialColor) {
      setSelectedColor(initialColor);
      setHexInput(initialColor);
      const rgb = hexToRgb(initialColor);
      if (rgb) {
        setRgbInputs(rgb);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        setHslInputs(hsl);
      }
    }
  }, [initialColor]);

  // Color conversion utilities
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const rgbToHex = (r, g, b) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const rgbToHsl = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  const hslToRgb = (h, s, l) => {
    h /= 360;
    s /= 100;
    l /= 100;
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  };

  const updateColorFromHex = (hex) => {
    if (/^#[0-9A-F]{6}$/i.test(hex)) {
      setSelectedColor(hex);
      const rgb = hexToRgb(hex);
      if (rgb) {
        setRgbInputs(rgb);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        setHslInputs(hsl);
      }
    }
  };

  const updateColorFromRgb = (newRgb) => {
    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setSelectedColor(hex);
    setHexInput(hex);
    const hsl = rgbToHsl(newRgb.r, newRgb.g, newRgb.b);
    setHslInputs(hsl);
  };

  const updateColorFromHsl = (newHsl) => {
    const rgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
    setRgbInputs(rgb);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setSelectedColor(hex);
    setHexInput(hex);
  };

  // Common colors palette
  const commonColors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#c026d3', '#e11d48', '#dc2626', '#ea580c',
    '#d97706', '#ca8a04', '#65a30d', '#16a34a', '#059669', '#0d9488',
    '#0891b2', '#0284c7', '#2563eb', '#4f46e5', '#7c3aed', '#9333ea',
    '#a21caf', '#be185d', '#6b7280', '#4b5563', '#374151', '#1f2937'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="tool-card-bg border-0 elegant-shadow max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="main-text">Color Picker</CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-[#5a3217]"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Color Preview */}
          <div className="flex items-center gap-4">
            <div 
              className="w-24 h-24 rounded-lg border-2 border-[#5a3217]/20"
              style={{ backgroundColor: selectedColor }}
            />
            <div>
              <h3 className="font-medium main-text mb-2">Selected Color</h3>
              <p className="text-sm main-text opacity-70">{selectedColor.toUpperCase()}</p>
            </div>
          </div>

          {/* Color Input Methods */}
          <div className="space-y-4">
            {/* Hex Input */}
            <div>
              <label className="block text-sm font-medium main-text mb-2">Hex Color</label>
              <Input
                type="text"
                value={hexInput}
                onChange={(e) => {
                  setHexInput(e.target.value);
                  if (e.target.value.length === 7) {
                    updateColorFromHex(e.target.value);
                  }
                }}
                placeholder="#000000"
                className="font-mono"
                style={{ backgroundColor: '#e5e4cd', borderColor: '#5a3217', color: '#5a3217' }}
              />
            </div>

            {/* RGB Inputs */}
            <div>
              <label className="block text-sm font-medium main-text mb-2">RGB Values</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs main-text opacity-70 mb-1">Red</label>
                  <Input
                    type="number"
                    min="0"
                    max="255"
                    value={rgbInputs.r}
                    onChange={(e) => {
                      const newRgb = { ...rgbInputs, r: Math.max(0, Math.min(255, parseInt(e.target.value) || 0)) };
                      setRgbInputs(newRgb);
                      updateColorFromRgb(newRgb);
                    }}
                    style={{ backgroundColor: '#e5e4cd', borderColor: '#5a3217', color: '#5a3217' }}
                  />
                </div>
                <div>
                  <label className="block text-xs main-text opacity-70 mb-1">Green</label>
                  <Input
                    type="number"
                    min="0"
                    max="255"
                    value={rgbInputs.g}
                    onChange={(e) => {
                      const newRgb = { ...rgbInputs, g: Math.max(0, Math.min(255, parseInt(e.target.value) || 0)) };
                      setRgbInputs(newRgb);
                      updateColorFromRgb(newRgb);
                    }}
                    style={{ backgroundColor: '#e5e4cd', borderColor: '#5a3217', color: '#5a3217' }}
                  />
                </div>
                <div>
                  <label className="block text-xs main-text opacity-70 mb-1">Blue</label>
                  <Input
                    type="number"
                    min="0"
                    max="255"
                    value={rgbInputs.b}
                    onChange={(e) => {
                      const newRgb = { ...rgbInputs, b: Math.max(0, Math.min(255, parseInt(e.target.value) || 0)) };
                      setRgbInputs(newRgb);
                      updateColorFromRgb(newRgb);
                    }}
                    style={{ backgroundColor: '#e5e4cd', borderColor: '#5a3217', color: '#5a3217' }}
                  />
                </div>
              </div>
            </div>

            {/* HSL Inputs */}
            <div>
              <label className="block text-sm font-medium main-text mb-2">HSL Values</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs main-text opacity-70 mb-1">Hue</label>
                  <Input
                    type="number"
                    min="0"
                    max="360"
                    value={hslInputs.h}
                    onChange={(e) => {
                      const newHsl = { ...hslInputs, h: Math.max(0, Math.min(360, parseInt(e.target.value) || 0)) };
                      setHslInputs(newHsl);
                      updateColorFromHsl(newHsl);
                    }}
                    style={{ backgroundColor: '#e5e4cd', borderColor: '#5a3217', color: '#5a3217' }}
                  />
                </div>
                <div>
                  <label className="block text-xs main-text opacity-70 mb-1">Saturation</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={hslInputs.s}
                    onChange={(e) => {
                      const newHsl = { ...hslInputs, s: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) };
                      setHslInputs(newHsl);
                      updateColorFromHsl(newHsl);
                    }}
                    style={{ backgroundColor: '#e5e4cd', borderColor: '#5a3217', color: '#5a3217' }}
                  />
                </div>
                <div>
                  <label className="block text-xs main-text opacity-70 mb-1">Lightness</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={hslInputs.l}
                    onChange={(e) => {
                      const newHsl = { ...hslInputs, l: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) };
                      setHslInputs(newHsl);
                      updateColorFromHsl(newHsl);
                    }}
                    style={{ backgroundColor: '#e5e4cd', borderColor: '#5a3217', color: '#5a3217' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Common Colors Palette */}
          <div>
            <label className="block text-sm font-medium main-text mb-2">Common Colors</label>
            <div className="grid grid-cols-6 gap-2">
              {commonColors.map((color) => (
                <button
                  key={color}
                  className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                    selectedColor === color ? 'border-[#5a3217] scale-110' : 'border-[#5a3217]/20'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    setSelectedColor(color);
                    setHexInput(color);
                    const rgb = hexToRgb(color);
                    if (rgb) {
                      setRgbInputs(rgb);
                      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                      setHslInputs(hsl);
                    }
                  }}
                  title={color.toUpperCase()}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              style={{ backgroundColor: '#f0e9d6', color: '#5a3217', borderColor: '#5a3217' }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => onColorSelect(selectedColor)}
              style={{ backgroundColor: '#007e81', color: 'white' }}
            >
              Select Color
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}