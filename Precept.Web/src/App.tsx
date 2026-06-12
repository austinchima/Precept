/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import StoryBank from './pages/StoryBank';
import QuizMode from './pages/QuizMode';
import JDMatcher from './pages/JDMatcher';
import AppTracker from './pages/AppTracker';
import Settings from './pages/Settings';
import HomePage from './pages/HomePage';
import NotFound1 from './components/ui/8bit-not-found1';

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

export default function App() {
  return (
    <AuthProvider>
      <Router>
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
      </Router>
    </AuthProvider>
  );
}

