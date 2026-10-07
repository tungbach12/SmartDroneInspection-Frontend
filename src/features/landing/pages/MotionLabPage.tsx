import { Box, Container, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import { animate, stagger, createDrawable, splitText } from 'animejs';

const points = [
  { x: 40, y: 220 },
  { x: 140, y: 120 },
  { x: 260, y: 180 },
  { x: 380, y: 80 },
  { x: 520, y: 140 },
  { x: 620, y: 60 },
];

function pathFrom(points: { x: number; y: number }[]) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

export function MotionLabPage() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const heading = root.querySelector('[data-scramble]');
    if (heading) {
      const split = splitText(heading, { words: true });
      animate(split.words, {
        opacity: [0, 1],
        translateY: [12, 0],
        delay: stagger(60),
        duration: 520,
        easing: 'easeOutExpo',
      });
    }

    const path = root.querySelector('[data-flight-path]') as SVGPathElement | null;
    if (path) {
      const [drawable] = createDrawable(path);
      if (drawable) {
        animate(drawable, {
          draw: ['0 0', '0 1'],
          duration: 2200,
          ease: 'inOutSine',
        });
      }
    }

    animate(root.querySelectorAll('[data-node]'), {
      opacity: [0, 1],
      scale: [0.4, 1],
      delay: stagger(220, { start: 500 }),
      duration: 420,
      easing: 'easeOutBack',
    });
  }, []);

  return (
    <Box sx={{ bgcolor: '#eaf5fb', minHeight: '100vh', py: 10 }}>
      <Container maxWidth="md">
        <div ref={rootRef}>
          <Typography data-scramble variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.03em', color: '#173a52' }}>
            Autonomous survey trajectory
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, color: '#5a7a8c' }}>
            Anime.js v4 - createDrawable flight path, spring nodes, split text.
          </Typography>
          <svg viewBox="0 0 660 260" width="100%" style={{ marginTop: 32 }}>
            <path
              data-flight-path
              d={pathFrom(points)}
              fill="none"
              stroke="#3fb6d8"
              strokeWidth={3}
              strokeLinecap="round"
            />
            {points.map((p, i) => (
              <circle key={i} data-node cx={p.x} cy={p.y} r={7} fill={i === points.length - 1 ? '#1d6f8f' : '#3fb6d8'} />
            ))}
          </svg>
        </div>
      </Container>
    </Box>
  );
}
