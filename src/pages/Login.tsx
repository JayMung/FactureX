import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, AlertTriangle } from 'lucide-react';
import { clientRateLimiter, getClientIdentifier, formatResetTime } from '@/lib/ratelimit-client';
import { validatePassword } from '@/lib/password-validation';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { 
  logLoginSuccess, 
  logLoginFailed, 
  logSignupSuccess, 
  logSignupFailed,
  logRateLimitExceeded 
} from '@/services/securityLogger';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  // Note: Using client-side rate limiting (localStorage)
  // For production, migrate to server-side rate limiting with Edge Functions

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check rate limit before attempting login
      const identifier = getClientIdentifier();
      const rateLimitResult = clientRateLimiter.check('login', identifier);

      if (!rateLimitResult.success) {
        const resetTime = formatResetTime(rateLimitResult.reset);
        await logRateLimitExceeded('login', rateLimitResult.remaining);
        throw new Error(
          `Trop de tentatives de connexion. Veuillez réessayer dans ${resetTime}.`
        );
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        await logLoginFailed(email, error.message);
        throw error;
      }
      
      await logLoginSuccess(email);
      navigate('/');
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
      const rateLimitResult = clientRateLimiter.check('signup', identifier);

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
        throw error;
      }
      
      // Check if user already exists (Supabase returns user but with identities empty)
      if (data?.user && !data?.user?.identities?.length) {
        await logSignupFailed(email, 'Email already exists');
        setError('Cet email est déjà utilisé. Veuillez vous connecter ou utiliser un autre email.');
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
    <div className="h-screen overflow-hidden flex items-center justify-center bg-white dark:bg-bg-dark px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 py-4">
        <div className="text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
            <span className="text-white text-2xl md:text-3xl font-bold">F</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight text-gray-900 dark:text-white">FactureX</h2>
          <p className="mt-2 text-base md:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {isSignUp ? 'Créer un compte' : 'Connectez-vous à votre compte'}
          </p>
        </div>

        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-lg rounded-lg">
          <CardHeader className="p-6">
            <CardTitle className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{isSignUp ? 'Inscription' : 'Connexion'}</CardTitle>
            <CardDescription className="text-sm text-gray-700 dark:text-gray-300">
              {isSignUp 
                ? 'Créez votre compte pour accéder à FactureX'
                : 'Entrez vos identifiants pour accéder à votre tableau de bord'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                <AlertDescription className="text-red-800 dark:text-red-200 text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-6">
              {isSignUp && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-900 dark:text-gray-100">Prénom</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium text-gray-900 dark:text-gray-100">Nom</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-900 dark:text-gray-100">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="vous@exemple.com"
                  className="border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-900 dark:text-gray-100">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500"
                />
                {isSignUp && <PasswordStrengthIndicator password={password} />}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-green-500 hover:bg-green-600 text-white text-sm font-medium leading-none py-6 rounded-md shadow-md hover:shadow-lg transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {isSignUp ? 'S\'inscrire' : 'Se connecter'}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-4">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 focus:outline-none focus:ring-2 focus:ring-green-500 rounded"
              >
                {isSignUp 
                  ? 'Déjà un compte? Connectez-vous'
                  : 'Pas de compte? Inscrivez-vous'
                }
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;