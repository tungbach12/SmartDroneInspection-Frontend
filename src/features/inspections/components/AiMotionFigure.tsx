import { Box } from '@mui/material';
import { aiMotionAssets, type AiMotionAssetName } from './aiMotionAssets';

interface AiMotionFigureProps {
  /** Asset key from {@link aiMotionAssets}. */
  name: AiMotionAssetName;
  size?: number;
  /** Set when the art is the only thing conveying the state; otherwise it stays decorative. */
  alt?: string;
}

/**
 * Renders one animated asset from `public/images/ai-motion/`.
 *
 * The motion is deliberately indeterminate. Neither the analyze nor the draft endpoint reports
 * intermediate stages, so nothing here implies a stage list, a percentage, or an ETA.
 */
export function AiMotionFigure({ name, size = 44, alt }: AiMotionFigureProps) {
  return (
    <Box
      component="img"
      src={aiMotionAssets[name]}
      alt={alt ?? ''}
      aria-hidden={alt ? undefined : true}
      width={size}
      height={size}
      sx={{ flexShrink: 0, display: 'block' }}
    />
  );
}
