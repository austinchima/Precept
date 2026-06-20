import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { SignInPage, Testimonial } from '../components/ui/sign-in';

const sampleTestimonials: Testimonial[] = [
  {
    avatarSrc: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop",
    name: "Sarah Chen",
    handle: "Sr. Software Engineer",
    text: "Precept's JD Matcher completely changed how I target roles. I secured 3 staff-level offers in two weeks."
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1556157382-97eda2d62296?q=80&w=150&auto=format&fit=crop",
    name: "Marcus Johnson",
    handle: "Full Stack Developer",
    text: "The Story Bank is a cheat code for behavioral rounds. Highly recommend this OS to any serious engineer."
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop",
    name: "Alex Rivera",
    handle: "Systems Architect",
    text: "The True Trajectory Scanner tracks every single pipeline event precisely. I never lose track of where I stand with any employer."
  }
];

export default function Landing() {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.state?.mode !== 'signup');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
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
      testimonials={sampleTestimonials}
    />
  );
}
