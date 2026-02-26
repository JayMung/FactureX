import { useState } from 'react';
// @ts-ignore - Temporary workaround for react-router-dom types
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, ArrowLeft, CheckCircle2, Shield, BarChart3, FileText, Zap } from 'lucide-react';
import { serverRateLimiter, getClientIdentifier, formatResetTime } from '@/lib/rate-limit-server';
import { showSuccess } from '@/utils/toast';
import {
  logLoginSuccess,
  logLoginFailed,
  logRateLimitExceeded
} from '@/services/securityLogger';
import { sessionManager } from '@/lib/security/session-management';

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
        const firstName = data.user.user_metadata?.first_name;
        showSuccess(firstName ? `Bienvenue, ${firstName} !` : 'Connexion réussie. Bienvenue !');
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
      // Check local rate limit first to prevent spamming Supabase
      const identifier = getClientIdentifier();
      // Cast to any to bypass strict type check for now
      const rateLimitResult = await serverRateLimiter.check('reset_password' as any, identifier);

      if (!rateLimitResult.success) {
        const resetTime = formatResetTime(rateLimitResult.reset);
        await logRateLimitExceeded('reset_password', rateLimitResult.remaining);
        throw new Error(
          `Trop de tentatives. Veuillez patienter ${resetTime} avant de réessayer.`
        );
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        // Handle Supabase specific rate limit error (429 or generic message)
        const errorMsg = error.message?.toLowerCase() || '';
        if (error.status === 429 || 
            errorMsg.includes('rate limit') || 
            errorMsg.includes('limite d\'envoi') ||
            errorMsg.includes('attendre')) {
          throw new Error("Limite d'envoi d'emails atteinte. Pour des raisons de sécurité, veuillez attendre 2-3 minutes avant de réessayer.");
        }
        throw error;
      }
      setResetEmailSent(true);
    } catch (error: any) {
      setError(error.message || "Erreur lors de l'envoi de l'email de réinitialisation");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: FileText, label: 'Facturation', desc: 'Créez et gérez vos factures en quelques clics' },
    { icon: BarChart3, label: 'Finances', desc: 'Suivez vos revenus et dépenses en temps réel' },
    { icon: Shield, label: 'Sécurité', desc: 'Données chiffrées et accès multi-rôles' },
    { icon: Zap, label: 'Performance', desc: 'Interface rapide et optimisée mobile' },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-background">

      {/* ─── Left Panel — Brand Hero ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-10 xl:p-14 overflow-hidden">

        {/* Animated gradient mesh background */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #21ac74 0%, #178a5c 60%, #0f6b45 100%)' }} />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-white/10 blur-[100px] animate-pulse-soft" />
          <div className="absolute bottom-[-15%] left-[-5%] w-[500px] h-[500px] rounded-full bg-white/8 blur-[80px] animate-pulse-soft [animation-delay:1s]" />
          <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full bg-white/5 blur-[60px] animate-pulse-soft [animation-delay:2s]" />
        </div>

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 bg-white/95 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm">
            <span className="text-xl font-extrabold tracking-tight" style={{ color: '#21ac74' }}>F</span>
          </div>
          <div>
            <span className="text-white text-2xl font-bold tracking-tight">FactureX</span>
            <span className="block text-white/60 text-xs font-medium tracking-wide uppercase">ERP Finances</span>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-8 max-w-lg">
          <div className="space-y-4">
            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-[1.1] tracking-tight">
              Pilotez vos finances
              <span className="block text-white/80 font-semibold">en toute confiance.</span>
            </h1>
            <p className="text-base text-white/70 leading-relaxed max-w-md">
              Factures, clients, trésorerie et logistique — tout votre ERP financier dans une interface moderne et sécurisée.
            </p>
          </div>

          {/* Feature cards — glassmorphism */}
          <div className="grid grid-cols-2 gap-3">
            {features.map((f) => (
              <div
                key={f.label}
                className="group rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-md p-4 transition-all duration-200 hover:bg-white/[0.12] hover:border-white/20 hover:translate-y-[-2px]"
              >
                <f.icon className="h-5 w-5 text-white/80 mb-2.5 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
                <p className="text-sm font-semibold text-white">{f.label}</p>
                <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer trust badge */}
        <div className="relative z-10 flex items-center gap-2 text-white/40 text-xs">
          <Shield className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Chiffrement AES-256 &middot; Multi-tenant &middot; RGPD</span>
        </div>
      </div>

      {/* ─── Right Panel — Auth Form ─────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 pb-10 sm:p-8 lg:p-12 xl:p-16">
        <div className="w-full max-w-[420px] space-y-8">

          {/* Mobile Logo */}
          <div className="lg:hidden text-center">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
              <span className="text-primary-foreground text-2xl font-extrabold">F</span>
            </div>
            <h2 className="text-xl font-bold text-foreground">FactureX</h2>
            <p className="text-xs text-muted-foreground mt-0.5">ERP Finances & Logistique</p>
          </div>

          {!showForgotPassword ? (
            // ─── LOGIN FORM ───────────────────────────────────────────
            <div className="space-y-7 animate-fade-in">
              {/* Header */}
              <div className="space-y-1.5 text-center lg:text-left">
                <h1 className="text-2xl lg:text-[28px] font-bold text-foreground tracking-tight">
                  Bon retour !
                </h1>
                <p className="text-sm text-muted-foreground">
                  Connectez-vous pour accéder à votre espace
                </p>
              </div>

              {/* Error */}
              {error && (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertDescription className="text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Form */}
              <form onSubmit={handleSignIn} className="space-y-5">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Adresse email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="email"
                    placeholder="vous@exemple.com"
                    className="h-11 rounded-lg border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary"
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">
                      Mot de passe
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs font-medium text-primary hover:text-primary/80 transition-colors duration-150"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="h-11 pr-10 rounded-lg border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  size="lg"
                  loading={loading}
                  className="w-full h-11 text-sm font-semibold rounded-lg shadow-sm hover:shadow-md"
                >
                  Se connecter
                </Button>
              </form>

              {/* Divider + footer */}
              <div className="pt-2 text-center">
                <p className="text-xs text-muted-foreground/60">
                  Plateforme sécurisée &middot; Accès réservé aux utilisateurs autorisés
                </p>
              </div>
            </div>
          ) : (
            // ─── FORGOT PASSWORD FORM ─────────────────────────────────
            <div className="space-y-6 animate-fade-in">
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmailSent(false);
                  setError('');
                }}
                aria-label="Retour à la connexion"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer group"
              >
                <ArrowLeft className="w-4 h-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
                Retour
              </button>

              <div className="space-y-1.5 text-center lg:text-left">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  Réinitialiser le mot de passe
                </h1>
                <p className="text-sm text-muted-foreground">
                  Entrez votre email pour recevoir un lien de réinitialisation.
                </p>
              </div>

              {error && (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertDescription className="text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {resetEmailSent ? (
                <div className="rounded-xl border p-6 text-center space-y-4 animate-scale-in" style={{ borderColor: '#21ac74', background: '#f0fdf4' }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: '#dcfce7' }}>
                    <CheckCircle2 className="w-6 h-6" style={{ color: '#21ac74' }} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Email envoyé !</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      Si un compte existe avec l'adresse <span className="font-medium">{email}</span>, vous recevrez les instructions.
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
                    <Label htmlFor="reset-email" className="text-sm font-medium text-foreground">
                      Adresse email
                    </Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="vous@exemple.com"
                      autoComplete="email"
                      disabled={loading}
                      className="h-11 rounded-lg border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    loading={loading}
                    className="w-full h-11 text-sm font-semibold rounded-lg shadow-sm hover:shadow-md"
                  >
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