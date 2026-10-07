import { useEffect } from 'react';
import { Box } from '@mui/material';
import { DarkHeader } from '../components/DarkHeader';
import { DarkHero } from '../components/DarkHero';
import { EventStreamTable } from '../components/EventStreamTable';
import { BentoGrid } from '../components/BentoGrid';
import { MetricsGrid } from '../components/MetricsGrid';
import { DarkRoleConsole } from '../components/DarkRoleConsole';
import { DarkFinalCta } from '../components/DarkFinalCta';
import { DarkFooter } from '../components/DarkFooter';

export default function LandingPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'SmartDroneInspection | High-Integrity Drone Telemetry & Cryptographic Inspection';

    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <Box
      sx={{
        bgcolor: '#000000',
        color: '#FFFFFF',
        minHeight: '100vh',
        overflowX: 'hidden',
        fontFamily: '"Geist Sans", sans-serif',
      }}
    >
      <DarkHeader />
      <main>
        <DarkHero />
        <EventStreamTable />
        <BentoGrid />
        <MetricsGrid />
        <DarkRoleConsole />
        <DarkFinalCta />
      </main>
      <DarkFooter />
    </Box>
  );
}
