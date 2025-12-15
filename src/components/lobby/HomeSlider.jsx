
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HomeBanner } from '@/entities/HomeBanner';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const colorPalette = {
  tobacco: '#5a3217',
  tangerine: '#f26222',
  bone: '#e5e4cd',
  teal: '#007e81',
  turquoise: '#9fd3ba',
};

const alignmentClasses = {
  left: 'justify-start items-center text-left',
  center: 'justify-center items-center text-center',
  right: 'justify-end items-center text-right',
};

export default function HomeSlider() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const banners = await HomeBanner.filter({ is_active: true });
        setSlides(banners.sort((a, b) => a.sort_order - b.sort_order));
      } catch (error) {
        console.error("Failed to fetch banners:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, []);

  useEffect(() => {
    if (slides.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [slides.length]);

  if (loading) {
    return (
      <div className="relative w-full h-[60vh] md:h-[400px] flex items-center justify-center" style={{ backgroundColor: 'transparent' }}>
        <Loader2 className="w-8 h-8 animate-spin text-tobacco" />
      </div>
    );
  }

  if (slides.length === 0) {
    return null; // Don't render anything if there are no active banners
  }

  return (
    <div className="relative w-full overflow-hidden h-[60vh] md:h-[400px]">
      <div
        className="flex transition-transform duration-700 ease-in-out h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((slide) => (
          <div key={slide.id} className="relative w-full flex-shrink-0 h-full">
            <img
              src={slide.image_url}
              alt={slide.alt_text}
              className="w-full h-full object-cover"
              style={{ boxShadow: 'none' }}
            />
            <div className={`absolute inset-0 flex p-4 pt-8 md:p-16 md:pt-16 ${alignmentClasses[slide.content_alignment] || alignmentClasses.left}`} style={{ alignItems: 'flex-start' }}>
              <div className="max-w-2xl">
                {slide.title && (
                  <h2
                    className="uppercase leading-none tracking-tighter text-[1.2rem] md:text-[3.2rem]"
                    style={{
                      color: colorPalette[slide.title_color] || colorPalette.tobacco,
                      fontFamily: "'Tanker', 'Abolition', 'Oswald', sans-serif",
                    }}
                  >
                    {slide.title}
                  </h2>
                )}
                {slide.strapline && (
                  <p
                    className="mt-2 text-sm md:text-xl"
                    style={{
                      color: colorPalette[slide.strapline_color] || colorPalette.tobacco,
                      fontFamily: "'BespokeSerif', serif",
                      fontWeight: 500,
                      fontStyle: 'italic',
                    }}
                  >
                    {slide.strapline}
                  </p>
                )}
                {slide.button_text && slide.button_link && (
                  <Link to={slide.button_link}>
                    <Button
                      size="lg"
                      className="mt-4 md:mt-6 uppercase font-bold text-sm md:text-lg px-4 py-2 md:px-8 md:py-4 hover:opacity-90 transition-all duration-300"
                      style={{
                        backgroundColor: colorPalette[slide.button_bg_color] || colorPalette.tangerine,
                        color: colorPalette[slide.button_text_color] || colorPalette.bone,
                      }}
                    >
                      {slide.button_text}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-3">
          {slides.map((_, slideIndex) => (
            <button
              key={slideIndex}
              onClick={() => setCurrentIndex(slideIndex)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                currentIndex === slideIndex ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${slideIndex + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
