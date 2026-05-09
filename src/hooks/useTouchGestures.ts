import { useEffect, useRef, useState } from 'react';

interface TouchGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchZoom?: (scale: number) => void;
  swipeThreshold?: number;
  enabled?: boolean;
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

/**
 * Hook to handle touch gestures (swipe, pinch-to-zoom)
 * Returns a ref to attach to the element
 */
export function useTouchGestures<T extends HTMLElement = HTMLDivElement>(
  options: TouchGestureOptions = {}
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinchZoom,
    swipeThreshold = 50,
    enabled = true,
  } = options;

  const elementRef = useRef<T>(null);
  const touchStartRef = useRef<TouchPoint | null>(null);
  const initialPinchDistanceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !elementRef.current) {
      return;
    }

    const element = elementRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        // Single touch - track for swipe
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          timestamp: Date.now(),
        };
      } else if (e.touches.length === 2) {
        // Two touches - track for pinch
        const distance = getDistance(
          e.touches[0].clientX,
          e.touches[0].clientY,
          e.touches[1].clientX,
          e.touches[1].clientY
        );
        initialPinchDistanceRef.current = distance;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistanceRef.current && onPinchZoom) {
        // Handle pinch zoom
        const currentDistance = getDistance(
          e.touches[0].clientX,
          e.touches[0].clientY,
          e.touches[1].clientX,
          e.touches[1].clientY
        );
        const scale = currentDistance / initialPinchDistanceRef.current;
        onPinchZoom(scale);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 1 && touchStartRef.current) {
        // Handle swipe
        const touchEnd = {
          x: e.changedTouches[0].clientX,
          y: e.changedTouches[0].clientY,
          timestamp: Date.now(),
        };

        const deltaX = touchEnd.x - touchStartRef.current.x;
        const deltaY = touchEnd.y - touchStartRef.current.y;
        const deltaTime = touchEnd.timestamp - touchStartRef.current.timestamp;

        // Check if it's a swipe (fast enough and far enough)
        const isSwipe = deltaTime < 300 && (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold);

        if (isSwipe) {
          // Determine swipe direction
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (deltaX > 0 && onSwipeRight) {
              onSwipeRight();
            } else if (deltaX < 0 && onSwipeLeft) {
              onSwipeLeft();
            }
          } else {
            // Vertical swipe
            if (deltaY > 0 && onSwipeDown) {
              onSwipeDown();
            } else if (deltaY < 0 && onSwipeUp) {
              onSwipeUp();
            }
          }
        }

        touchStartRef.current = null;
      }

      // Reset pinch tracking
      if (e.touches.length < 2) {
        initialPinchDistanceRef.current = null;
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onPinchZoom, swipeThreshold]);

  return elementRef;
}

/**
 * Calculate distance between two points
 */
function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Hook for swipe-to-dismiss gesture
 */
export function useSwipeToDismiss(
  onDismiss: () => void,
  options: { threshold?: number; enabled?: boolean } = {}
) {
  const { threshold = 100, enabled = true } = options;
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const elementRef = useTouchGestures({
    enabled,
    onSwipeRight: () => {
      if (offset > threshold) {
        onDismiss();
      } else {
        setOffset(0);
      }
    },
  });

  useEffect(() => {
    if (!enabled || !elementRef.current) {
      return;
    }

    const element = elementRef.current;
    let startX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      setIsDragging(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentX = e.touches[0].clientX;
      const delta = currentX - startX;
      if (delta > 0) {
        setOffset(delta);
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      if (offset > threshold) {
        onDismiss();
      } else {
        setOffset(0);
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, offset, threshold, onDismiss]);

  return {
    elementRef,
    offset,
    isDragging,
  };
}
