import { useState } from 'react';
// @ts-ignore - Temporary workaround for react-router-dom types
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { serverRateLimiter, getClientIdentifier, formatResetTime } from '@/lib/rate-limit-server';
import {
  logLoginSuccess,
  logLoginFailed,
  logRateLimitExceeded
} from '@/services/securityLogger';
import { sessionManager, useSessionSecurity } from '@/lib/security/session-management';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // États pour la récupération de mot de passe
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  const navigate = useNavigate();

  // Initialize session security
  useSessionSecurity({
    enableTimeout: true,
    enableConcurrentLimit: true,
    enableRegeneration: true,
    customTimeout: 15 * 60 * 1000, // 15 minutes
    maxSessions: 3
  });

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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;
      setResetEmailSent(true);
    } catch (error: any) {
      setError(error.message || "Erreur lors de l'envoi de l'email de réinitialisation");
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

          {!showForgotPassword ? (
            // --- LOGIN FORM ---
            <>
              {/* Form Header */}
              <div className="space-y-2 text-center md:text-left">
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                  Bienvenue sur FactureX!
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Connectez-vous à votre compte
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
              <form onSubmit={handleSignIn} className="space-y-5">
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
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 font-medium transition-colors"
                    >
                      Mot de passe oublié?
                    </button>
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
                </div>

                {/* Remember Me Checkbox */}
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

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-12 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Connexion
                </Button>
              </form>
            </>
          ) : (
            // --- FORGOT PASSWORD FORM ---
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmailSent(false);
                  setError('');
                }}
                className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Retour à la connexion
              </button>

              <div className="space-y-2 text-center md:text-left">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Mot de passe oublié
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                </p>
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                  <AlertDescription className="text-red-800 dark:text-red-200 text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {resetEmailSent ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center space-y-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-green-900 dark:text-green-100">Email envoyé !</h3>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Si un compte existe avec l'adresse {email}, vous recevrez les instructions de réinitialisation.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                        setShowForgotPassword(false);
                        setResetEmailSent(false);
                    }}
                    variant="outline"
                    className="w-full mt-2"
                  >
                    Retour à la connexion
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Votre Email
                    </Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="vous@exemple.com"
                      className="h-12 border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Envoyer le lien
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;