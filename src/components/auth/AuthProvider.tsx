"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { sessionManager, startSessionMonitoring, cleanupExpiredSessions } from '@/lib/security/session-management';
import { logLogout } from '@/services/securityLogger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  sessionValid: boolean;
  remainingTime: number;
  updateActivity: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  // Handle session expiration
  const handleSessionExpired = async () => {
    console.log('Session expired, signing out...');
    await signOut();
  };

  // Handle session warning
  const handleSessionWarning = (timeRemaining: number) => {
    console.log(`Session expiring in ${Math.round(timeRemaining / 60000)} minutes`);
    // Could show a warning dialog or notification here
  };

  // Handle session renewal
  const handleSessionRenewed = () => {
    console.log('Session renewed');
    setRemainingTime(sessionManager.getRemainingTime());
  };

  // Update session activity
  const updateActivity = () => {
    sessionManager.updateActivity();
    setSessionValid(sessionManager.isSessionValid());
    setRemainingTime(sessionManager.getRemainingTime());
  };

  useEffect(() => {
    // Clean up expired sessions on mount
    cleanupExpiredSessions();

    // Initialize session monitoring
    startSessionMonitoring(
      handleSessionExpired,
      handleSessionWarning,
      handleSessionRenewed
    );

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        // Initialize session management
        if (session && session.user) {
          sessionManager.createSession(session, session.user);
          setSessionValid(sessionManager.isSessionValid());
          setRemainingTime(sessionManager.getRemainingTime());
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_IN' && session && session.user) {
          // Create new session info
          sessionManager.createSession(session, session.user);
          setSessionValid(sessionManager.isSessionValid());
          setRemainingTime(sessionManager.getRemainingTime());
        } else if (event === 'SIGNED_OUT') {
          // Clear session info
          sessionManager.clearSessionInfo();
          setSessionValid(false);
          setRemainingTime(0);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      sessionManager.stopSessionTracking();
    };
  }, []);

  const signOut = async () => {
    try {
      await logLogout(); // Log logout event before signing out
      await supabase.auth.signOut();
      sessionManager.clearSessionInfo();
      setUser(null);
      setSession(null);
      setSessionValid(false);
      setRemainingTime(0);
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  // SECURITY: Check for both admin and super_admin roles in app_metadata
  const isAdmin = user?.app_metadata?.role === 'admin' || user?.app_metadata?.role === 'super_admin';

  const value = {
    user,
    session,
    loading,
    signOut,
    isAdmin,
    sessionValid,
    remainingTime,
    updateActivity
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};