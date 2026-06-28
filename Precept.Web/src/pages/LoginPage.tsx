import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { SignInPage } from '../components/ui/sign-in';
import { api } from '../api';
import type { Testimonial } from '../types';

export default function LoginPage() {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.state?.mode !== 'signup');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadTestimonials() {
      try {
        const data = await api.get<Testimonial[]>('/api/testimonial/public', { skipAuth: true });
        setTestimonials(data);
      } catch (err) {
        console.error('Failed to load testimonials:', err);
      }
    }
    loadTestimonials();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await login(data.email as string, data.password as string, data.rememberMe === 'on');
      } else {
        await register(data.firstName as string, data.lastName as string, data.email as string, data.password as string);
      }
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      let errorMsg = 'Authentication protocol failed.';
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.message) {
            errorMsg = parsed.message;
          } else if (typeof parsed === 'object') {
            const list = Object.values(parsed).flat() as string[];
            if (list.length > 0) {
              errorMsg = list.join(' ');
            }
          }
        } catch {
          errorMsg = err.message;
        }
      }
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setError("Google integration is currently offline. Use standard protocol.");
  };

  return (
    <SignInPage 
      isLogin={isLogin}
      isLoading={isLoading}
      error={error}
      onToggleMode={() => {
        setIsLogin(!isLogin);
        setError(null);
      }}
      onSubmit={handleSubmit}
      onGoogleSignIn={handleGoogleSignIn}
      onBack={() => navigate('/')}
      heroImageSrc="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1400&auto=format&fit=crop"
      testimonials={testimonials}
    />
  );
}
