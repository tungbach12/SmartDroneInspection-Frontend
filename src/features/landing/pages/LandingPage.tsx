import { useEffect } from 'react';
import { Box } from '@mui/material';
import { FinalCta } from '../components/FinalCta';
import { HeroSection } from '../components/HeroSection';
import { LandingFooter } from '../components/LandingFooter';
import { LandingHeader } from '../components/LandingHeader';
import { ProductProofPanel } from '../components/ProductProofPanel';
import { RoleCards } from '../components/RoleCards';
import { SecuritySection } from '../components/SecuritySection';
import { TrustStrip } from '../components/TrustStrip';

export default function LandingPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'SmartDroneInspection | Inspection management';

    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <Box sx={{ bgcolor: '#f4f8fa', overflowX: 'hidden' }}>
      <LandingHeader />
      <main>
        <HeroSection />
        <TrustStrip />
        <ProductProofPanel />
        <RoleCards />
        <SecuritySection />
        <FinalCta />
      </main>
      <LandingFooter />
    </Box>
  );
}
