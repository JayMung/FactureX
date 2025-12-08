import { useState, useEffect } from 'react';
// @ts-ignore - Temporary workaround for react-router-dom types
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { serverRateLimiter, getClientIdentifier, formatResetTime } from '@/lib/rate-limit-server';
import { validatePassword } from '@/lib/password-validation';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import {
  logLoginSuccess,
  logLoginFailed,
  logSignupSuccess,
  logSignupFailed,
  logRateLimitExceeded
} from '@/services/securityLogger';
import { sessionManager, useSessionSecurity } from '@/lib/security/session-management';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Initialize session security
  const { updateActivity } = useSessionSecurity({
    enableTimeout: true,
    enableConcurrentLimit: true,
    enableRegeneration: true,
    customTimeout: 15 * 60 * 1000, // 15 minutes
    maxSessions: 3
  });

  // Server-side rate limiting using Supabase Edge Functions
  // Secure against localStorage bypass and incognito mode

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check rate limit before attempting login
      const identifier = getClientIdentifier();
      const rateLimitResult = await serverRateLimiter.check('login', identifier);

      if (!rateLimitResult.success) {
        const resetTime = formatResetTime(rateLimitResult.reset);
        await logRateLimitExceeded('login', rateLimitResult.remaining);
        throw new Error(
          `Trop de tentatives de connexion. Veuillez réessayer dans ${resetTime}.`
        );
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        await logLoginFailed(email, error.message);
        // Generic error message to prevent user enumeration
        throw new Error('Email ou mot de passe incorrect');
      }

      if (data.session && data.user) {
        // Check concurrent session limit
        const canCreateSession = await sessionManager.checkConcurrentSessions(data.user.id);
        if (!canCreateSession) {
          await supabase.auth.signOut();
          throw new Error('Nombre maximum de sessions simultanées atteint. Veuillez vous déconnecter d\'un autre appareil.');
        }

        // Create secure session
        sessionManager.createSession(data.session, data.user);

        // Regenerate session ID for security
        await sessionManager.regenerateSession();

        await logLoginSuccess(email);
        navigate('/');
      } else {
        throw new Error('Erreur lors de la création de la session');
      }
    } catch (error: any) {
      setError(error.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate password strength before attempting signup
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors[0] || 'Le mot de passe ne respecte pas les exigences de sécurité');
      }

      // Check rate limit before attempting signup
      const identifier = getClientIdentifier();
      const rateLimitResult = await serverRateLimiter.check('signup', identifier);

      if (!rateLimitResult.success) {
        const resetTime = formatResetTime(rateLimitResult.reset);
        await logRateLimitExceeded('signup', rateLimitResult.remaining);
        throw new Error(
          `Trop de tentatives d'inscription. Veuillez réessayer dans ${resetTime}.`
        );
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName
          }
        }
      });

      if (error) {
        await logSignupFailed(email, error.message);
        // Generic error message to prevent user enumeration
        throw new Error('Erreur lors de la création du compte. Veuillez réessayer.');
      }

      // Check if user already exists (Supabase returns user but with identities empty)
      if (data?.user && !data?.user?.identities?.length) {
        await logSignupFailed(email, 'Email already exists');
        setError('Si ce compte existe, vérifiez votre email pour confirmer votre inscription.');
        setIsSignUp(false);
        return;
      }

      await logSignupSuccess(email);
      setError('Inscription réussie! Veuillez vérifier votre email pour confirmer votre compte.');
      setIsSignUp(false);
    } catch (error: any) {
      setError(error.message || 'Erreur d\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Hero Section */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-green-400 via-green-500 to-green-600 dark:from-green-600 dark:via-green-700 dark:to-green-800 p-8 lg:p-12 flex-col justify-between relative overflow-hidden">
        {/* Logo */}
        <div className="flex items-center gap-3 z-10">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
            <span className="text-green-500 text-xl font-bold">F</span>
          </div>
          <span className="text-white text-2xl font-bold">FactureX</span>
        </div>

        {/* Hero Content */}
        <div className="z-10 space-y-6">
          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
            Simplifiez votre gestion de factures
          </h1>
          <p className="text-lg text-green-50 max-w-md leading-relaxed">
            Gérez vos factures, clients et finances en toute simplicité avec FactureX
          </p>

          {/* Pagination Dots */}
          <div className="flex gap-2 pt-4">
            <div className="w-8 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white/40 rounded-full"></div>
            <div className="w-1 h-1 bg-white/40 rounded-full"></div>
          </div>
        </div>

        {/* Background Image/Illustration */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <img
            src="/login-hero.png"
            alt="FactureX Illustration"
            className="w-full h-full object-cover mix-blend-overlay"
          />
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-900 p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="md:hidden text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
              <span className="text-white text-2xl font-bold">F</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">FactureX</h2>
          </div>

          {/* Sign In Button (Top Right) */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setIsSignUp(!isSignUp)}
              className="rounded-full px-6 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {isSignUp ? 'Se connecter' : 'S\'inscrire'}
            </Button>
          </div>

          {/* Form Header */}
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
              {isSignUp ? 'Créer un compte' : 'Bienvenue sur FactureX!'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isSignUp
                ? 'Créez votre compte pour commencer'
                : 'Connectez-vous à votre compte'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
              <AlertDescription className="text-red-800 dark:text-red-200 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-5">
            {/* Name Fields for Sign Up */}
            {isSignUp && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prénom
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="h-12 border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nom
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="h-12 border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Votre Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="vous@exemple.com"
                className="h-12 border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mot de passe
                </Label>
                {!isSignUp && (
                  <button
                    type="button"
                    className="text-sm text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 font-medium"
                  >
                    Mot de passe oublié?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="h-12 pr-10 border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {isSignUp && <PasswordStrengthIndicator password={password} />}
            </div>

            {/* Remember Me Checkbox (Login only) */}
            {!isSignUp && (
              <div className="flex items-center">
                <input
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded"
                />
                <Label htmlFor="remember" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Se souvenir de moi
                </Label>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {isSignUp ? 'S\'inscrire' : 'Connexion'}
            </Button>
          </form>

          {/* Toggle Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isSignUp ? 'Vous avez déjà un compte?' : 'Vous n\'avez pas de compte?'}{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 rounded"
              >
                {isSignUp ? 'Connectez-vous' : 'Inscrivez-vous'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;