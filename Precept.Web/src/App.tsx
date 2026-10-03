/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { LogoMark } from './components/ui/kit';

// Eagerly loaded components (critical path)
import Layout from './components/Layout';
import Landing from './pages/Landing';

// Lazy loaded components (code splitting)
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const StoryBank = lazy(() => import('./pages/StoryBank'));
const QuizMode = lazy(() => import('./pages/QuizMode'));
const JDMatcher = lazy(() => import('./pages/JDMatcher'));
const Readiness = lazy(() => import('./pages/Readiness'));
const AppTracker = lazy(() => import('./pages/AppTracker'));
const MockInterview = lazy(() => import('./pages/MockInterview'));
const Settings = lazy(() => import('./pages/Settings'));
const Capture = lazy(() => import('./pages/Capture'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const NotFound = lazy(() => import('./pages/NotFound'));

import PageTransition from './components/ui/PageTransition';

function FullPageLoader() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-bg" role="status" aria-label="Loading">
      <LogoMark size={28} className="animate-pulse" />
    </div>
  );
}

// Protected routes redirect signed-out visitors to the landing page.
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Redirects already-authenticated users to /dashboard
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullPageLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// Fallback while a lazy route chunk loads: a skeleton in the content area.
const RouteLoader = () => (
  <div className="mx-auto w-full max-w-6xl px-4 pt-8 md:px-8" role="status" aria-label="Loading">
    <div className="skeleton h-8 w-56" />
    <div className="skeleton mt-3 h-4 w-80" />
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      <div className="skeleton h-28" />
      <div className="skeleton h-28" />
      <div className="skeleton h-28" />
    </div>
  </div>
);

export default function App() {
  return (
    <ToastProvider>
    <AuthProvider>
      <Router>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
            <Route path="/login" element={<PublicOnlyRoute><PageTransition><LoginPage /></PageTransition></PublicOnlyRoute>} />
            <Route path="/terms" element={<PageTransition><TermsOfService /></PageTransition>} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
              <Route path="story-bank" element={<PageTransition><StoryBank /></PageTransition>} />
              <Route path="jd-matcher" element={<PageTransition><JDMatcher /></PageTransition>} />
              <Route path="mock-interview" element={<PageTransition><MockInterview /></PageTransition>} />
              <Route path="readiness" element={<PageTransition><Readiness /></PageTransition>} />
              <Route path="applications" element={<PageTransition><AppTracker /></PageTransition>} />
              <Route path="settings" element={<PageTransition><Settings /></PageTransition>} />
            </Route>

            {/* Quiz mode is full screen, so it doesn't use the standard layout */}
            <Route path="/story-bank/quiz" element={
              <ProtectedRoute>
                <PageTransition><QuizMode /></PageTransition>
              </ProtectedRoute>
            } />

            {/* Capture page — invoked by the bookmarklet */}
            <Route path="/capture" element={
              <ProtectedRoute>
                <PageTransition><Capture /></PageTransition>
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
    </ToastProvider>
  );
}
