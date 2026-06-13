/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';

// Eagerly loaded components (critical path)
import Layout from './components/Layout';
import HomePage from './pages/HomePage';

// Lazy loaded components (code splitting)
const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const StoryBank = lazy(() => import('./pages/StoryBank'));
const QuizMode = lazy(() => import('./pages/QuizMode'));
const JDMatcher = lazy(() => import('./pages/JDMatcher'));
const AppTracker = lazy(() => import('./pages/AppTracker'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound1 = lazy(() => import('./components/ui/8bit-not-found1'));

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
    <AuthProvider>
      <Router>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Landing />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="story-bank" element={<StoryBank />} />
              <Route path="jd-matcher" element={<JDMatcher />} />
              <Route path="applications" element={<AppTracker />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Quiz mode is full screen, so it doesn't use the standard layout */}
            <Route path="/story-bank/quiz" element={
              <ProtectedRoute>
                <QuizMode />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound1 />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

