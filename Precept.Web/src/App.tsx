/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ToastProvider } from './components/ui/Toast';

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
const Settings = lazy(() => import('./pages/Settings'));
const NotFound1 = lazy(() => import('./components/ui/8bit-not-found1'));

import PageTransition from './components/ui/PageTransition';

// A simple protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-secondary font-mono text-sm text-brand-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-brand-primary/10 border-t-brand-primary animate-spin" />
          <span className="animate-pulse">Accessing Secure Vault...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Fallback loader for lazy routes
const RouteLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center font-mono text-sm text-brand-primary/60">
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      <span>Loading module...</span>
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
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
              <Route path="story-bank" element={<PageTransition><StoryBank /></PageTransition>} />
              <Route path="jd-matcher" element={<PageTransition><JDMatcher /></PageTransition>} />
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
            
            <Route path="*" element={<PageTransition><NotFound1 /></PageTransition>} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
    </ToastProvider>
  );
}
