﻿import { useEffect } from 'react';
import { Box } from '@mui/material';
import { FinalCta } from '../components/FinalCta';
import { HeroSection } from '../components/HeroSection';
import { ReviewGateSection } from '../components/ReviewGateSection';
import { LandingFooter } from '../components/LandingFooter';
import { LandingHeader } from '../components/LandingHeader';
import { ProductProofPanel } from '../components/ProductProofPanel';
import { RoleCards } from '../components/RoleCards';
import { SecuritySection } from '../components/SecuritySection';
import { TrustStrip } from '../components/TrustStrip';
import { WorkflowTimeline } from '../components/WorkflowTimeline';
import { useLandingColors } from '../landingTheme';

export default function LandingPage() {
  const colors = useLandingColors();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'SmartDroneInspection | Inspection management';

    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <Box sx={{ bgcolor: colors.paper, overflowX: 'hidden' }}>
      <LandingHeader />
      <main>
        <HeroSection />
        <TrustStrip />
        <WorkflowTimeline />
        <ProductProofPanel />
        <ReviewGateSection />
        <RoleCards />
        <SecuritySection />
        <FinalCta />
      </main>
      <LandingFooter />
    </Box>
  );
}
