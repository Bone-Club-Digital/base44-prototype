
import React, { useRef, useState, useLayoutEffect } from 'react';
import { Droppable, Draggable } from "@hello-pangea/dnd";
import BackgammonChecker from "./BackgammonChecker";

export default function BackgammonPoint({ pointNumber, checkers, isTop, isPlayerTurn, playerColor, onCheckerClick }) {
  const pointRef = useRef(null);
  const [pipWidth, setPipWidth] = useState(56); // Default size, corresponding to w-14 (56px)

  useLayoutEffect(() => {
    const pointElement = pointRef.current;
    if (!pointElement) return;

    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        const newWidth = entries[0].contentRect.width;
        // Only update if width changes and is positive to avoid infinite loops or issues with zero width
        if (newWidth > 0 && newWidth !== pipWidth) {
          setPipWidth(newWidth);
        }
      }
    });

    resizeObserver.observe(pointElement);

    return () => resizeObserver.disconnect();
  }, [pipWidth]); // Re-run effect if pipWidth changes, ensuring ResizeObserver works with current state

  // Determine if the point is "odd" to apply the orange texture, or "even" for the brown texture.
  const isOddPoint = pointNumber % 2 !== 0;

  const pointBackgroundStyle = {};

  // Apply specific textures based on whether the point is odd or even.
  if (isOddPoint) {
    pointBackgroundStyle.backgroundImage = "url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/efdd6ba8f_orange_2.jpg')";
    pointBackgroundStyle.backgroundSize = "200px";
    pointBackgroundStyle.backgroundRepeat = "repeat";
  } else {
    // Apply brown texture to "even" points.
    pointBackgroundStyle.backgroundImage = "url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f36f82f9d_chocolate.jpg')";
    pointBackgroundStyle.backgroundSize = "200px";
    pointBackgroundStyle.backgroundRepeat = "repeat";
  }

  // --- Start: Checker Data Extraction (Preserved from original code) ---
  // Determines the count and color of checkers on this point, handling both array and object formats.
  let checkerCount = 0;
  let checkerColor = null;

  if (checkers) {
    if (Array.isArray(checkers)) {
      checkerCount = checkers.length;
      checkerColor = checkers.length > 0 ? checkers[0]?.color : null;
    } else if (typeof checkers === 'object' && checkers.count !== undefined) {
      checkerCount = checkers.count || 0;
      checkerColor = checkers.color;
    }
  }
  // --- End: Checker Data Extraction ---

  // Determines if a checker on this point can be clicked by the current player.
  // This variable is retained for potential future use or styling, though the point's onClick no longer directly uses it.
  const canClick = isPlayerTurn && checkerColor === playerColor && checkerCount > 0;

  const renderCheckers = () => {
    if (!checkers || checkers.count === 0) return null;

    const checkerElements = [];
    const checkerSize = pipWidth; // Use the dynamically measured width
    const displayCount = Math.min(checkers.count, 5); // Only show up to 5 checkers

    // Use a more consistent approach for cross-browser compatibility
    // Calculate offset to ensure 5 checkers fit within the pip height
    // Use a fixed ratio that works consistently across browsers
    const offset = displayCount > 1 ? Math.floor(checkerSize * 0.77) : 0;

    for (let i = 0; i < displayCount; i++) {
      const positionStyle = {
        position: 'absolute',
        [isTop ? 'top' : 'bottom']: `${i * offset}px`,
        zIndex: i + 1,
        left: '50%',
        transform: 'translateX(-50%)',
        width: `${checkerSize}px`,
        height: `${checkerSize}px`,
      };

      // Check if this is the top-most checker in a stack that has more than 5 total checkers.
      const isTopCheckerWithMore = (i === displayCount - 1) && (checkers.count > 5);

      checkerElements.push(
        <Draggable
          key={`point-${pointNumber}-checker-${i}`}
          draggableId={`point-${pointNumber}-checker-${i}`}
          index={i}
          isDragDisabled={!isPlayerTurn || playerColor !== checkers.color}
        >
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className="absolute"
              style={{
                width: `${checkerSize}px`,
                height: `${checkerSize}px`,
                ...provided.draggableProps.style,
                ...positionStyle
              }}
            >
              <BackgammonChecker
                color={checkers.color}
                index={i}
                isClickable={isPlayerTurn && playerColor === checkers.color}
                onClick={() => onCheckerClick(pointNumber, i)}
                isDragging={snapshot.isDragging}
                size={checkerSize} // Pass the dynamic size to the checker
              />
              {isTopCheckerWithMore && (
                <div 
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ zIndex: 10 }}
                >
                    <div
                        className="rounded-full flex items-center justify-center font-bold shadow-lg"
                        style={{
                            width: `${checkerSize * 0.55}px`,
                            height: `${checkerSize * 0.55}px`,
                            backgroundColor: '#f26222',
                            color: '#e5e4cd',
                            fontSize: `${checkerSize * 0.35}px`
                        }}
                    >
                        {checkers.count}
                    </div>
                </div>
              )}
            </div>
          )}
        </Draggable>
      );
    }
    return checkerElements;
  };

  return (
    <Droppable droppableId={`point-${pointNumber}`}>
      {(provided, snapshot) => (
        <div
          ref={(el) => {
            // Assign both react-beautiful-dnd's ref and our local ref
            provided.innerRef(el);
            pointRef.current = el;
          }}
          {...provided.droppableProps}
          className={`relative w-full h-full flex flex-col items-center ${isTop ? "justify-start" : "justify-end"}`}
          onClick={() => onCheckerClick(pointNumber)} // Directly calls onCheckerClick prop when point is clicked
        >
          {/* Triangle shape implemented using a div with clipPath */}
          <div
            className={`absolute w-full h-full`}
            style={{
              clipPath: isTop
                ? "polygon(0 0, 100% 0, 50% 100%)" // Clip path for top points (triangle pointing down)
                : "polygon(50% 0, 0 100%, 100% 100%)", // Clip path for bottom points (triangle pointing up)
              ...pointBackgroundStyle, // Applies the background image (orange or brown texture)
            }}
          ></div>

          {/* Container for the checkers */}
          <div className="relative w-full h-full">
            {renderCheckers()} {/* Render the checkers within this container */}
          </div>

          {/* Invisible placeholder for Droppable, hidden as per the outline */}
          <div className="hidden">{provided.placeholder}</div>
        </div>
      )}
    </Droppable>
  );
}
