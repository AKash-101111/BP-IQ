import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Layers, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (session?: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        onLoginSuccess(data?.session || { user: { email } });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            onLoginSuccess({ user: { email } });
            return;
          }
          throw error;
        }
        onLoginSuccess(data.session);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Google Auth failed');
    }
  };

  return (
    <div className="flex w-screen h-screen bg-canvas">
      {/* Left branding split */}
      <div className="hidden lg:flex flex-col flex-1 bg-accent justify-between p-12 text-white overflow-hidden relative">
        <div className="z-10 relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">BlueprintIQ</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mt-12 mb-4">
            Uncertainty-Aware<br/>Blueprint-to-BOQ Intelligence
          </h1>
          <p className="text-white/80 text-lg max-w-md leading-relaxed">
            Automated geometric extraction, deterministic quantity estimation, and RAG-verified compliance checking for construction professionals.
          </p>
        </div>
        
        <div className="z-10 relative">
          <div className="flex gap-4 opacity-80 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              <span>IS 456 / IS 1200 / NBC Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              <span>Gemma 2B Local Engine</span>
            </div>
          </div>
        </div>

        {/* Decorative background element */}
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-1/4 translate-y-1/4">
          <Layers className="w-[800px] h-[800px]" />
        </div>
      </div>

      {/* Right Login form split */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 sm:p-12 bg-panel">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-textPrimary">BlueprintIQ</span>
            </div>
            <h2 className="text-2xl font-bold text-textPrimary tracking-tight">
              {isSignUp ? 'Create your account' : 'Sign in to workstation'}
            </h2>
            <p className="text-sm text-textSecondary mt-2">
              {isSignUp ? 'Enter your details to get started.' : 'Welcome back! Please enter your details.'}
            </p>
          </div>

          {error && (
            <div className="p-4 bg-issue-subtle border border-issue-border rounded-md flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-issue shrink-0 mt-0.5" />
              <p className="text-sm text-issue">{error}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-textSecondary" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-borderline rounded-md leading-5 bg-canvas text-textPrimary placeholder-textSecondary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent sm:text-sm transition-colors"
                    placeholder="engineer@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-textSecondary" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-borderline rounded-md leading-5 bg-canvas text-textPrimary placeholder-textSecondary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent sm:text-sm transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors disabled:opacity-70"
            >
              {loading ? 'Authenticating...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-borderline" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-panel text-textSecondary">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleLogin}
                type="button"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-borderline rounded-md shadow-sm bg-panel text-sm font-medium text-textPrimary hover:bg-canvas transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  <path fill="none" d="M1 1h22v22H1z" />
                </svg>
                Google
              </button>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-textSecondary">
            {isSignUp ? 'Already have an account? ' : 'Need an account? '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-medium text-accent hover:text-accent-hover transition-colors"
            >
              {isSignUp ? 'Sign in instead' : 'Create an account'}
            </button>
          </p>

          <div className="pt-4 border-t border-borderline">
            <button
              onClick={() => onLoginSuccess({ user: { email: email || 'engineer@company.com' } })}
              type="button"
              className="w-full py-2.5 px-4 bg-canvas border border-borderline rounded-md text-xs font-semibold text-textPrimary hover:bg-borderline transition-colors flex items-center justify-center gap-2"
            >
              <Layers className="w-4 h-4 text-accent" />
              <span>Enter Workstation (Engineer Access)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
