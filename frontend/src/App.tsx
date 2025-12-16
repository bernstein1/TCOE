import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { useStore } from './store';
import ErrorBoundary from './components/ErrorBoundary';
import api from './services/api';

// Lazy load pages for code splitting
const LandingPage = lazy(() => import('./pages/LandingPage'));
const ProfileBuilder = lazy(() => import('./pages/ProfileBuilder'));
const Recommendations = lazy(() => import('./pages/Recommendations'));
const Review = lazy(() => import('./pages/Review'));
const ChatWidget = lazy(() => import('./components/ChatWidget'));

// Loading component with glass design
function PageLoader() {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      <div className="gradient-mesh" />
      <div className="relative z-10 text-center">
        <div className="w-12 h-12 mx-auto mb-4 border-3 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white/60">Loading...</p>
      </div>
    </div>
  );
}

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function ClerkProviderWithRoutes() {
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
    >
      <AppContent />
    </ClerkProvider>
  );
}

function AppContent() {
  const { i18n } = useTranslation();
  const { language, isChatOpen, currentStep, sessionId, sessionToken, theme } = useStore();
  const { getToken } = useAuth();

  // Sync session token to API service
  useEffect(() => {
    if (sessionToken) {
      api.setSessionToken(sessionToken);
    }
  }, [sessionToken]);

  // Sync Clerk token
  useEffect(() => {
    const syncToken = async () => {
      const token = await getToken();
      api.setClerkToken(token);
    };
    syncToken();
    // Set up interval to refresh token if needed, or rely on Clerk's reactivity
    // Clerk's useAuth doesn't automatically trigger on token refresh in all cases, 
    // but getToken() handles the refresh logic. 
    // We can just call it when we make requests if we passed the getter, 
    // but our API service expects a string. 
    // A better pattern might be to use an interceptor that calls getToken(), 
    // but we can't easily pass the hook to the class.
    // For this POC, syncing on mount and when auth state changes is okay.
    // Actually, useAuth returns `userId` and `sessionId` which change.
  }, [getToken]);

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/:companySlug" element={<LandingPage />} />

            {/* Protected Routes (Optional for now, as some flows are anonymous) */}
            <Route path="/:companySlug/profile" element={<ProfileBuilder />} />
            <Route path="/:companySlug/recommendations" element={<Recommendations />} />
            <Route path="/:companySlug/review" element={<Review />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>

        {sessionId && currentStep > 0 && (
          <Suspense fallback={null}>
            <ChatWidget isOpen={isChatOpen} />
          </Suspense>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default ClerkProviderWithRoutes;

