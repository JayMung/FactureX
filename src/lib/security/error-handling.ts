/**
 * Enhanced error handling for security
 */

import { sanitizeErrorMessage } from './validation';

export interface SecurityError {
  code: string;
  message: string;
  isSecurityRelated: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  timestamp: number;
  context?: Record<string, any>;
}

export class SecurityErrorHandler {
  private static instance: SecurityErrorHandler;
  private securityEvents: SecurityError[] = [];

  private constructor() {}

  static getInstance(): SecurityErrorHandler {
    if (!SecurityErrorHandler.instance) {
      SecurityErrorHandler.instance = new SecurityErrorHandler();
    }
    return SecurityErrorHandler.instance;
  }

  /**
   * Handle Supabase errors with security considerations
   */
  handleSupabaseError(error: any, context?: Record<string, any>): SecurityError {
    const timestamp = Date.now();
    const sanitizedMessage = sanitizeErrorMessage(error);
    
    // Determine if this is a security-related error
    const isSecurityRelated = this.isSecurityRelatedError(error);
    const riskLevel = this.assessRiskLevel(error, isSecurityRelated);

    const securityError: SecurityError = {
      code: error.code || 'UNKNOWN',
      message: sanitizedMessage,
      isSecurityRelated,
      riskLevel,
      timestamp,
      context
    };

    // Log security events
    if (isSecurityRelated) {
      this.logSecurityEvent(securityError);
    }

    return securityError;
  }

  /**
   * Check if error is security-related
   */
  private isSecurityRelatedError(error: any): boolean {
    const securityErrorCodes = [
      'PGRST301', // RLS policy violation
      'PGRST200', // Not found (potential enumeration)
      'PGRST204', // No content (potential unauthorized access)
      '42501',    // Permission denied
      '42830',    // Foreign key violation (potential data manipulation)
      '23505',    // Unique violation (potential data manipulation)
    ];

    const securityErrorPatterns = [
      /permission/i,
      /unauthorized/i,
      /forbidden/i,
      /policy/i,
      /rls/i,
      /authentication/i,
      /token/i,
    ];

    return (
      securityErrorCodes.includes(error.code) ||
      securityErrorPatterns.some(pattern => pattern.test(error.message))
    );
  }

  /**
   * Assess risk level of error
   */
  private assessRiskLevel(error: any, isSecurityRelated: boolean): 'low' | 'medium' | 'high' {
    if (!isSecurityRelated) return 'low';

    const highRiskPatterns = [
      /policy.*violation/i,
      /permission.*denied/i,
      /authentication.*failed/i,
      /token.*invalid/i,
    ];

    const mediumRiskPatterns = [
      /not.*found/i,
      /unauthorized/i,
      /forbidden/i,
    ];

    if (highRiskPatterns.some(pattern => pattern.test(error.message))) {
      return 'high';
    }

    if (mediumRiskPatterns.some(pattern => pattern.test(error.message))) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Log security events for monitoring
   */
  private logSecurityEvent(error: SecurityError): void {
    // Add to in-memory log
    this.securityEvents.push(error);

    // Keep only last 100 events
    if (this.securityEvents.length > 100) {
      this.securityEvents = this.securityEvents.slice(-100);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.warn('Security Event:', error);
    }

    // In production, you might want to send this to a security monitoring service
    if (import.meta.env.PROD) {
      // Example: Send to security monitoring service
      // this.sendToSecurityMonitoring(error);
    }
  }

  /**
   * Get recent security events
   */
  getRecentSecurityEvents(limit: number = 10): SecurityError[] {
    return this.securityEvents.slice(-limit);
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    totalEvents: number;
    highRiskEvents: number;
    mediumRiskEvents: number;
    lowRiskEvents: number;
    recentActivity: SecurityError[];
  } {
    const totalEvents = this.securityEvents.length;
    const highRiskEvents = this.securityEvents.filter(e => e.riskLevel === 'high').length;
    const mediumRiskEvents = this.securityEvents.filter(e => e.riskLevel === 'medium').length;
    const lowRiskEvents = this.securityEvents.filter(e => e.riskLevel === 'low').length;
    const recentActivity = this.securityEvents.slice(-5);

    return {
      totalEvents,
      highRiskEvents,
      mediumRiskEvents,
      lowRiskEvents,
      recentActivity
    };
  }

  /**
   * Clear security events log
   */
  clearSecurityLog(): void {
    this.securityEvents = [];
  }
}

/**
 * Global error handler for Supabase operations
 */
export const handleSupabaseError = (error: any, context?: Record<string, any>): SecurityError => {
  const errorHandler = SecurityErrorHandler.getInstance();
  return errorHandler.handleSupabaseError(error, context);
};

/**
 * Check if error should be shown to user or hidden for security
 */
export const shouldShowErrorToUser = (error: SecurityError): boolean => {
  // Hide high-risk security errors from users
  if (error.riskLevel === 'high') {
    return false;
  }

  // Hide authentication/authorization errors that might reveal system information
  const hiddenPatterns = [
    /policy/i,
    /rls/i,
    /authentication/i,
    /token/i,
    /permission/i,
  ];

  return !hiddenPatterns.some(pattern => pattern.test(error.message));
};

/**
 * Get user-friendly error message
 */
export const getUserFriendlyErrorMessage = (error: SecurityError): string => {
  // For security-related errors, return generic messages
  if (error.isSecurityRelated) {
    switch (error.riskLevel) {
      case 'high':
        return 'Une erreur de sécurité est survenue. Veuillez réessayer plus tard.';
      case 'medium':
        return 'Accès non autorisé. Veuillez vous connecter à nouveau.';
      case 'low':
        return 'Une erreur est survenue. Veuillez réessayer.';
      default:
        return 'Une erreur est survenue. Veuillez réessayer.';
    }
  }

  // For non-security errors, return the sanitized message
  return error.message || 'Une erreur inconnue est survenue.';
};

/**
 * Log security event manually
 */
export const logSecurityEvent = (
  code: string,
  message: string,
  riskLevel: 'low' | 'medium' | 'high',
  context?: Record<string, any>
): void => {
  const errorHandler = SecurityErrorHandler.getInstance();
  const securityError: SecurityError = {
    code,
    message,
    isSecurityRelated: true,
    riskLevel,
    timestamp: Date.now(),
    context
  };
  
  errorHandler['logSecurityEvent'](securityError);
};
