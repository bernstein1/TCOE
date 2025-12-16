import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn, useAuth } from '@clerk/clerk-react';
import Dashboard from './pages/Dashboard';
import Plans from './pages/Plans';
import Analytics from './pages/Analytics';
import Employees from './pages/Employees';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Layout from './components/Layout';
import api from './services/api';
import './index.css';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function ClerkProviderWithRoutes() {
  const navigate = useNavigate();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      navigate={(to) => navigate(to)}
    >
      <App />
    </ClerkProvider>
  );
}

function AuthSync() {
  const { getToken } = useAuth();

  React.useEffect(() => {
    const syncToken = async () => {
      const token = await getToken();
      api.setClerkToken(token);
    };
    syncToken();
  }, [getToken]);

  return null;
}

function App() {
  return (
    <>
      <AuthSync />
      <Routes>
        <Route
          path="/login"
          element={
            <SignedOut>
              <Login />
            </SignedOut>
          }
        />

        <Route
          path="*"
          element={
            <>
              <SignedIn>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="plans" element={<Plans />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="employees" element={<Employees />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>
                </Routes>
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </>
          }
        />
      </Routes>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ClerkProviderWithRoutes />
    </BrowserRouter>
  </React.StrictMode>
);

