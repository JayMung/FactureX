/**
 * Session Management Security Utilities
 * 
 * Implements secure session handling with proper timeout,
 * concurrent session limits, and session regeneration.
 */

// @ts-ignore - Temporary workaround for Supabase types
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Session configuration
export const SESSION_CONFIG = {
  // Session timeout in milliseconds (15 minutes)
  SESSION_TIMEOUT: 15 * 60 * 1000,
  
  // Maximum concurrent sessions per user
  MAX_CONCURRENT_SESSIONS: 3,
  
  // Session warning time (5 minutes before timeout)
  WARNING_TIME: 5 * 60 * 1000,
  
  // Session check interval (30 seconds)
  CHECK_INTERVAL: 30 * 1000,
  
  // Grace period for session renewal (2 minutes)
  GRACE_PERIOD: 2 * 60 * 1000,
  
  // Maximum session age (24 hours)
  MAX_SESSION_AGE: 24 * 60 * 60 * 1000
};

// Session tracking interface
export interface SessionInfo {
  sessionId: string;
  userId: string;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
}

export interface SessionSecurityConfig {
  enableTimeout: boolean;
  enableConcurrentLimit: boolean;
  enableRegeneration: boolean;
  customTimeout?: number;
  maxSessions?: number;
}

const DEFAULT_CONFIG: SessionSecurityConfig = {
  enableTimeout: true,
  enableConcurrentLimit: true,
  enableRegeneration: true,
  customTimeout: SESSION_CONFIG.SESSION_TIMEOUT,
  maxSessions: SESSION_CONFIG.MAX_CONCURRENT_SESSIONS
};

/**
 * Session Manager Class
 */
export class SessionManager {
  private static instance: SessionManager;
  private sessionInfo: SessionInfo | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private warningTimeout: NodeJS.Timeout | null = null;
  private config: SessionSecurityConfig;
  private callbacks: {
    onSessionExpired?: () => void;
    onSessionWarning?: (remainingTime: number) => void;
    onSessionRenewed?: () => void;
    onConcurrentSessionLimit?: () => void;
  } = {};

  private constructor() {
    this.config = DEFAULT_CONFIG;
    this.initializeSessionTracking();
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Configure session security settings
   */
  public configure(config: Partial<SessionSecurityConfig>): void {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set session event callbacks
   */
  public setCallbacks(callbacks: typeof SessionManager.prototype.callbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Initialize session tracking
   */
  private initializeSessionTracking(): void {
    // Load existing session info from localStorage
    const stored = localStorage.getItem('sessionInfo');
    if (stored) {
      try {
        this.sessionInfo = JSON.parse(stored);
        this.validateAndStartTracking();
      } catch (error) {
        console.error('Invalid session info stored:', error);
        this.clearSessionInfo();
      }
    }
  }

  /**
   * Create new session info
   */
  public createSession(session: Session, user: User): SessionInfo {
    const now = Date.now();
    
    this.sessionInfo = {
      sessionId: session.access_token || this.generateSessionId(),
      userId: user.id,
      createdAt: now,
      lastActivity: now,
      expiresAt: now + (this.config.customTimeout || SESSION_CONFIG.SESSION_TIMEOUT),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent,
      isActive: true
    };

    this.storeSessionInfo();
    this.startSessionTracking();
    
    return this.sessionInfo;
  }

  /**
   * Update session activity
   */
  public updateActivity(): void {
    if (!this.sessionInfo || !this.sessionInfo.isActive) {
      return;
    }

    const now = Date.now();
    this.sessionInfo.lastActivity = now;
    
    // Extend session expiration
    if (this.config.enableTimeout) {
      this.sessionInfo.expiresAt = now + (this.config.customTimeout || SESSION_CONFIG.SESSION_TIMEOUT);
    }

    this.storeSessionInfo();
    this.callbacks.onSessionRenewed?.();
  }

  /**
   * Check if session is valid
   */
  public isSessionValid(): boolean {
    if (!this.sessionInfo || !this.sessionInfo.isActive) {
      return false;
    }

    const now = Date.now();
    
    // Check session timeout
    if (this.config.enableTimeout && now > this.sessionInfo.expiresAt) {
      return false;
    }

    // Check maximum session age
    if (now > this.sessionInfo.createdAt + SESSION_CONFIG.MAX_SESSION_AGE) {
      return false;
    }

    return true;
  }

  /**
   * Get remaining session time
   */
  public getRemainingTime(): number {
    if (!this.sessionInfo || !this.sessionInfo.isActive) {
      return 0;
    }

    const now = Date.now();
    const remaining = this.sessionInfo.expiresAt - now;
    
    return Math.max(0, remaining);
  }

  /**
   * Start session tracking
   */
  private startSessionTracking(): void {
    // Clear existing tracking
    this.stopSessionTracking();

    // Start periodic session checks
    this.checkInterval = setInterval(() => {
      this.checkSessionStatus();
    }, SESSION_CONFIG.CHECK_INTERVAL);

    // Set warning timeout
    if (this.config.enableTimeout) {
      const warningTime = this.sessionInfo!.expiresAt - SESSION_CONFIG.WARNING_TIME;
      const timeToWarning = warningTime - Date.now();
      
      if (timeToWarning > 0) {
        this.warningTimeout = setTimeout(() => {
          this.callbacks.onSessionWarning?.(SESSION_CONFIG.WARNING_TIME);
        }, timeToWarning);
      }
    }
  }

  /**
   * Stop session tracking
   */
  public stopSessionTracking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
      this.warningTimeout = null;
    }
  }

  /**
   * Check session status
   */
  private checkSessionStatus(): void {
    if (!this.isSessionValid()) {
      this.handleSessionExpired();
    }
  }

  /**
   * Handle session expiration
   */
  private handleSessionExpired(): void {
    this.stopSessionTracking();
    this.sessionInfo!.isActive = false;
    this.storeSessionInfo();
    this.callbacks.onSessionExpired?.();
  }

  /**
   * Validate and start tracking for existing session
   */
  private validateAndStartTracking(): void {
    if (this.isSessionValid()) {
      this.startSessionTracking();
    } else {
      this.handleSessionExpired();
    }
  }

  /**
   * Store session info in localStorage
   */
  private storeSessionInfo(): void {
    if (this.sessionInfo) {
      localStorage.setItem('sessionInfo', JSON.stringify(this.sessionInfo));
    }
  }

  /**
   * Clear session info
   */
  public clearSessionInfo(): void {
    this.sessionInfo = null;
    this.stopSessionTracking();
    localStorage.removeItem('sessionInfo');
  }

  /**
   * Generate random session ID
   */
  private generateSessionId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Get client IP address (simplified version)
   */
  private getClientIP(): string {
    // In a real implementation, this would come from server headers
    // For now, return a placeholder
    return 'client-ip';
  }

  /**
   * Check concurrent session limit
   */
  public async checkConcurrentSessions(userId: string): Promise<boolean> {
    if (!this.config.enableConcurrentLimit) {
      return true;
    }

    try {
      // This would typically be a server-side check
      // For now, we'll simulate it with localStorage
      const sessionsKey = `user_sessions_${userId}`;
      const existingSessions = JSON.parse(localStorage.getItem(sessionsKey) || '[]');
      
      // Clean up expired sessions
      const validSessions = existingSessions.filter((session: any) => {
        return Date.now() < session.expiresAt;
      });

      if (validSessions.length >= this.config.maxSessions!) {
        this.callbacks.onConcurrentSessionLimit?.();
        return false;
      }

      // Add current session
      validSessions.push({
        sessionId: this.sessionInfo?.sessionId,
        createdAt: Date.now(),
        expiresAt: Date.now() + (this.config.customTimeout || SESSION_CONFIG.SESSION_TIMEOUT)
      });

      localStorage.setItem(sessionsKey, JSON.stringify(validSessions));
      return true;
    } catch (error) {
      console.error('Error checking concurrent sessions:', error);
      return true; // Allow session on error
    }
  }

  /**
   * Regenerate session ID
   */
  public async regenerateSession(): Promise<boolean> {
    if (!this.config.enableRegeneration || !this.sessionInfo) {
      return false;
    }

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Create new session info with regenerated ID
        const oldSessionId = this.sessionInfo.sessionId;
        this.sessionInfo.sessionId = this.generateSessionId();
        this.sessionInfo.lastActivity = Date.now();
        
        this.storeSessionInfo();
        
        // Log session regeneration for security
        console.log(`Session regenerated: ${oldSessionId} -> ${this.sessionInfo.sessionId}`);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error regenerating session:', error);
      return false;
    }
  }

  /**
   * Get session info
   */
  public getSessionInfo(): SessionInfo | null {
    return this.sessionInfo;
  }

  /**
   * Force session expiration
   */
  public forceExpiration(): void {
    if (this.sessionInfo) {
      this.sessionInfo.expiresAt = Date.now() - 1000;
      this.handleSessionExpired();
    }
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();

/**
 * Session validation utilities
 */
export const validateSession = (session: Session | null): boolean => {
  if (!session) return false;
  
  const now = Date.now();
  const expiresAt = new Date(session.expires_at || 0).getTime();
  
  return now < expiresAt;
};

export const isSessionExpired = (session: Session | null): boolean => {
  return !validateSession(session);
};

export const getSessionAge = (session: Session | null): number => {
  if (!session) return 0;
  
  const now = Date.now();
  const createdAt = new Date((session as any).created_at || 0).getTime();
  
  return now - createdAt;
};

/**
 * Session security hooks
 */
export const useSessionSecurity = (config?: Partial<SessionSecurityConfig>) => {
  const manager = SessionManager.getInstance();
  
  if (config) {
    manager.configure(config);
  }
  
  return {
    isSessionValid: () => manager.isSessionValid(),
    getRemainingTime: () => manager.getRemainingTime(),
    updateActivity: () => manager.updateActivity(),
    clearSession: () => manager.clearSessionInfo(),
    regenerateSession: () => manager.regenerateSession(),
    getSessionInfo: () => manager.getSessionInfo()
  };
};

/**
 * Session monitoring utilities
 */
export const startSessionMonitoring = (
  onExpired: () => void,
  onWarning?: (remainingTime: number) => void,
  onRenewed?: () => void
) => {
  const manager = SessionManager.getInstance();
  
  manager.setCallbacks({
    onSessionExpired: onExpired,
    onSessionWarning: onWarning,
    onSessionRenewed: onRenewed
  });
  
  return manager;
};

/**
 * Session cleanup utilities
 */
export const cleanupExpiredSessions = (): void => {
  // Clean up expired session data from localStorage
  const keys = Object.keys(localStorage);
  
  keys.forEach(key => {
    if (key.startsWith('user_sessions_')) {
      try {
        const sessions = JSON.parse(localStorage.getItem(key) || '[]');
        const validSessions = sessions.filter((session: any) => {
          return Date.now() < session.expiresAt;
        });
        
        if (validSessions.length === 0) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(validSessions));
        }
      } catch (error) {
        localStorage.removeItem(key);
      }
    }
  });
};

export default {
  SessionManager,
  sessionManager,
  useSessionSecurity,
  validateSession,
  isSessionExpired,
  getSessionAge,
  startSessionMonitoring,
  cleanupExpiredSessions,
  SESSION_CONFIG
};
