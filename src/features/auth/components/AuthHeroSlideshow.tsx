import { useEffect, useState } from 'react';
import { PauseRounded, PlayArrowRounded } from '@mui/icons-material';
import { Box, IconButton, Stack } from '@mui/material';

const slideIntervalMs = 5_500;

const heroSlides = [
  '/images/auth/real-drone-building.jpg',
  '/images/auth/real-drone-sunset.jpg',
  '/images/auth/auth-hero-drone.jpg',
] as const;

export function AuthHeroSlideshow() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mediaQuery) {
      return;
    }

    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener?.('change', updatePreference);

    return () => mediaQuery.removeEventListener?.('change', updatePreference);
  }, []);

  useEffect(() => {
    if (isPaused || prefersReducedMotion) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % heroSlides.length);
    }, slideIntervalMs);

    return () => window.clearTimeout(timeoutId);
  }, [activeIndex, isPaused, prefersReducedMotion]);

  return (
    <>
      <Box
        aria-hidden="true"
        sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {heroSlides.map((slide, index) => (
          <Box
            key={slide}
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `linear-gradient(180deg, rgba(8, 20, 29, 0.55) 0%, rgba(8, 20, 29, 0.15) 45%, rgba(8, 20, 29, 0.88) 100%), url('${slide}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: activeIndex === index ? 1 : 0,
              transition: prefersReducedMotion ? 'none' : 'opacity 900ms ease',
            }}
          />
        ))}
      </Box>

      <Box
        role="group"
        aria-label="Hero image controls"
        sx={{
          position: 'absolute',
          zIndex: 3,
          right: 2,
          bottom: 2.25,
          left: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {heroSlides.map((slide, index) => (
            <Box
              key={slide}
              component="button"
              type="button"
              aria-label={`Show slide ${index + 1} of ${heroSlides.length}`}
              aria-current={activeIndex === index ? 'true' : undefined}
              onClick={() => setActiveIndex(index)}
              sx={{
                display: 'block',
                width: activeIndex === index ? 32 : 20,
                height: 4,
                p: 0,
                border: 0,
                borderRadius: 2,
                bgcolor:
                  activeIndex === index
                    ? '#FFFFFF'
                    : 'rgba(255, 255, 255, 0.3)',
                boxShadow:
                  activeIndex === index
                    ? '0 0 10px rgba(255, 255, 255, 0.6)'
                    : 'none',
                cursor: 'pointer',
                transition: prefersReducedMotion
                  ? 'none'
                  : 'width 200ms ease, background-color 200ms ease',
                '&:focus-visible': {
                  outline: '2px solid #63BAC0',
                  outlineOffset: 4,
                },
              }}
            />
          ))}
        </Stack>

        <IconButton
          aria-label={isPaused ? 'Play background slideshow' : 'Pause background slideshow'}
          onClick={() => setIsPaused((paused) => !paused)}
          size="small"
          sx={{
            position: 'absolute',
            right: 0,
            color: '#FFFFFF',
            bgcolor: 'rgba(8, 20, 29, 0.42)',
            '&:hover': { bgcolor: 'rgba(8, 20, 29, 0.68)' },
            '&:focus-visible': {
              outline: '2px solid #63BAC0',
              outlineOffset: 2,
            },
          }}
        >
          {isPaused ? <PlayArrowRounded fontSize="small" /> : <PauseRounded fontSize="small" />}
        </IconButton>
      </Box>
    </>
  );
}
