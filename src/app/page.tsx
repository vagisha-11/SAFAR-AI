'use client';

import { useSafarStore } from '@/lib/store';
import LandingPage from '@/components/LandingPage';
import TripDashboard from '@/components/TripDashboard';
import LoadingOverlay from '@/components/LoadingOverlay';

export default function Home() {
  const { activeStep, isLoading } = useSafarStore();

  return (
    <main>
      {isLoading && <LoadingOverlay />}
      {activeStep === 'input' && <LandingPage />}
      {(activeStep === 'planning' || activeStep === 'results') && <TripDashboard />}
    </main>
  );
}
