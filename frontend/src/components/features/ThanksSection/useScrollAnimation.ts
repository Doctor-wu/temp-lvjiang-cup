import { useState, useEffect, useRef, useCallback } from 'react';

interface UseScrollAnimationOptions {
  /** 触发阈值 (0-1) */
  threshold?: number;
  /** 进入视口后的延迟触发时间 (ms) */
  delay?: number;
  /** 是否只触发一次 */
  once?: boolean;
}

/**
 * 滚动进入动画 Hook
 * 检测元素是否进入视口，支持延迟触发和减少动画偏好检测
 */
export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const { threshold = 0.1, delay = 0, once = true } = options;
  const [isVisible, setIsVisible] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const hasTriggered = useRef(false);

  // 检测用户是否偏好减少动画
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldAnimate(!mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setShouldAnimate(!e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;

      if (entry.isIntersecting) {
        if (once && hasTriggered.current) return;

        const triggerAnimation = () => {
          setIsVisible(true);
          hasTriggered.current = true;
        };

        if (delay > 0) {
          setTimeout(triggerAnimation, delay);
        } else {
          triggerAnimation();
        }
      } else if (!once) {
        setIsVisible(false);
      }
    },
    [delay, once]
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin: '0px 0px -50px 0px',
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, handleIntersection]);

  return { ref, isVisible, shouldAnimate };
}

/**
 * 批量滚动动画 Hook
 * 用于列表项依次进入动画
 */
export function useStaggeredAnimation(itemCount: number, baseDelay: number = 100) {
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTriggered = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTriggered.current) {
          hasTriggered.current = true;

          // 依次触发每个子项的动画
          for (let i = 0; i < itemCount; i++) {
            setTimeout(() => {
              setVisibleItems(prev => new Set([...prev, i]));
            }, i * baseDelay);
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [itemCount, baseDelay]);

  return { containerRef, visibleItems };
}
