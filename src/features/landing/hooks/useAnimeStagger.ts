import { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';

export function useAnimeStagger(
  selector: string,
  params: { delay?: number; duration?: number; translateY?: number; once?: boolean } = {},
) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const elements = root.querySelectorAll(selector);
    if (!elements.length) return;

    const animation = animate(elements, {
      opacity: [0, 1],
      translateY: [params.translateY ?? 14, 0],
      delay: stagger(params.delay ?? 70),
      duration: params.duration ?? 620,
      easing: 'easeOutExpo',
    });

    return () => {
      animation.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}
