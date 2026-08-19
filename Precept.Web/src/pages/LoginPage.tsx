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

  const { login, register, demoLogin, googleLogin, isAuthenticated } = useAuth();
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

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const rawEmail = (data.email as string) ?? '';
    const email = rawEmail.replace(/\s/g, '');

    if (!emailRegex.test(email)) {
      setError('Enter a valid email address with a domain and TLD (e.g. user@example.com).');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await login(email, data.password as string, data.rememberMe === 'on');
      } else {
        const acceptTerms = data.acceptTerms === 'on';
        if (!acceptTerms) {
          setError('You must agree to the Terms of Service to register.');
          setIsLoading(false);
          return;
        }
        await register(data.firstName as string, data.lastName as string, email, data.password as string, acceptTerms);
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

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await demoLogin();
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Demo login error:', err);
      setError('Failed to initialize instant demo session. Please try standard login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // In production with Google GIS Client or standard OAuth popup,
      // you pass Google credential idToken. Here we prompt or authenticate seamlessly.
      const promptedEmail = window.prompt("Enter your Google Account email:", "alex.engineer@gmail.com");
      if (!promptedEmail) {
        setIsLoading(false);
        return;
      }
      await googleLogin(promptedEmail, "Alex", "Chen");
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setError(err?.message || 'Google authentication encountered an issue.');
    } finally {
      setIsLoading(false);
    }
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
      onDemoLogin={handleDemoLogin}
      onBack={() => navigate('/')}
      testimonials={testimonials}
    />
  );
}
