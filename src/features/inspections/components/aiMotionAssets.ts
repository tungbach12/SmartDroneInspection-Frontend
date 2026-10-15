/**
 * Paths for the animated SVG art used by the two model-assisted steps: advisory detection (MF3-05)
 * and report draft creation (MF3-07).
 *
 * The files live in `public/images/ai-motion/` and carry their own CSS keyframes, so the browser
 * animates them without any work in the React render path, and each one honors
 * `prefers-reduced-motion` internally. They are mounted only while the matching request is actually
 * in flight, so motion always means "the model is working right now" rather than decoration on an
 * idle screen.
 */
export const aiMotionAssets = {
  advisoryScan: '/images/ai-motion/advisory-scan.svg',
  advisoryLens: '/images/ai-motion/advisory-lens.svg',
  advisoryPulse: '/images/ai-motion/advisory-pulse.svg',
  draftStack: '/images/ai-motion/draft-stack.svg',
  draftBurst: '/images/ai-motion/draft-burst.svg',
  draftRibbon: '/images/ai-motion/draft-ribbon.svg',
} as const;

export type AiMotionAssetName = keyof typeof aiMotionAssets;
