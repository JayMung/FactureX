import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft, CheckCircle2, Shield, LayoutDashboard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { serverRateLimiter, getClientIdentifier, formatResetTime } from '@/lib/rate-limit-server';
import { showSuccess } from '@/utils/toast';
import {
  logLoginSuccess,
  logLoginFailed,
  logRateLimitExceeded
} from '@/services/securityLogger';
import { sessionManager } from '@/lib/security/session-management';

interface MobileLoginPageProps {
  onLoginSuccess: () => void;
}

export const MobileLoginPage = ({ onLoginSuccess }: MobileLoginPageProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const identifier = getClientIdentifier();
      const rateLimitResult = await serverRateLimiter.check('login', identifier);

      if (!rateLimitResult.success) {
        const resetTime = formatResetTime(rateLimitResult.reset);
        await logRateLimitExceeded('login', rateLimitResult.remaining);
        throw new Error(`Trop de tentatives. Réessayez dans ${resetTime}.`);
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        await logLoginFailed(email, error.message);
        throw new Error('Email ou mot de passe incorrect');
      }

      if (data.session && data.user) {
        const canCreateSession = await sessionManager.checkConcurrentSessions(data.user.id);
        if (!canCreateSession) {
          await supabase.auth.signOut();
          throw new Error("Nombre maximum de sessions atteint. Déconnectez-vous d'un autre appareil.");
        }

        sessionManager.createSession(data.session, data.user);
        await sessionManager.regenerateSession();
        await logLoginSuccess(email);

        const firstName = data.user.user_metadata?.first_name;
        showSuccess(firstName ? `Bienvenue, ${firstName} !` : 'Connexion réussie !');
        onLoginSuccess();
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
      const identifier = getClientIdentifier();
      const rateLimitResult = await serverRateLimiter.check('reset_password' as any, identifier);

      if (!rateLimitResult.success) {
        const resetTime = formatResetTime(rateLimitResult.reset);
        await logRateLimitExceeded('reset_password', rateLimitResult.remaining);
        throw new Error(`Trop de tentatives. Attendez ${resetTime}.`);
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        const errorMsg = error.message?.toLowerCase() || '';
        if (error.status === 429 || errorMsg.includes('rate limit')) {
          throw new Error("Limite d'envoi atteinte. Attendez 2-3 minutes.");
        }
        throw error;
      }
      setResetEmailSent(true);
    } catch (error: any) {
      setError(error.message || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header Brand */}
      <div className="flex flex-col items-center pt-16 pb-8 px-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl mb-4"
          style={{ background: 'linear-gradient(135deg, #21ac74 0%, #178a5c 100%)' }}
        >
          <LayoutDashboard size={36} className="text-white" />
        </motion.div>
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">FactureX</h1>
          <p className="text-xs text-slate-500 mt-1">ERP Finances & Logistique</p>
        </motion.div>
      </div>

      {/* Card */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 25 }}
        className="flex-1 bg-white rounded-t-3xl shadow-2xl px-6 pt-8 pb-12"
      >
        <AnimatePresence mode="wait">
          {!showForgotPassword ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-900">Bon retour !</h2>
                <p className="text-sm text-slate-500 mt-1">Connectez-vous pour accéder à votre espace.</p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="vous@exemple.com"
                    autoComplete="email"
                    className="w-full border border-slate-200 rounded-xl py-3.5 px-4 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mot de passe</label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
                    >
                      Oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full border border-slate-200 rounded-xl py-3.5 pl-4 pr-12 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 active:scale-90 transition-transform"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 text-sm font-bold text-white rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-60"
                  style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg, #21ac74 0%, #178a5c 100%)' }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                      Connexion...
                    </span>
                  ) : 'Se connecter'}
                </button>
              </form>

              <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs">
                <Shield size={12} />
                <span>Accès sécurisé · Données chiffrées</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button
                onClick={() => { setShowForgotPassword(false); setResetEmailSent(false); setError(''); }}
                className="flex items-center gap-1.5 text-sm text-slate-500 font-semibold active:scale-95 transition-transform"
              >
                <ArrowLeft size={16} />
                Retour
              </button>

              <div>
                <h2 className="text-xl font-bold text-slate-900">Réinitialiser</h2>
                <p className="text-sm text-slate-500 mt-1">Nous vous enverrons un lien de réinitialisation.</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium">
                  {error}
                </div>
              )}

              {resetEmailSent ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={24} className="text-emerald-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">Email envoyé !</p>
                  <p className="text-xs text-slate-500">Si un compte existe pour <span className="font-medium">{email}</span>, vous recevrez les instructions.</p>
                  <button
                    onClick={() => { setShowForgotPassword(false); setResetEmailSent(false); }}
                    className="w-full py-3 text-sm font-bold text-emerald-700 border border-emerald-200 rounded-xl mt-2 active:scale-95 transition-all"
                  >
                    Retour à la connexion
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      placeholder="vous@exemple.com"
                      autoComplete="email"
                      className="w-full border border-slate-200 rounded-xl py-3.5 px-4 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 text-sm font-bold text-white rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-60"
                    style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg, #21ac74 0%, #178a5c 100%)' }}
                  >
                    {loading ? 'Envoi...' : 'Envoyer le lien'}
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
