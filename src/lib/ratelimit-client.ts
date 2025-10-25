// Client-side rate limiting (temporary solution)
// Note: This is NOT secure as it can be bypassed by clearing localStorage
// For production, use server-side rate limiting with Supabase Edge Functions

interface RateLimitRecord {
  attempts: number[];
  blockedUntil?: number;
}

const RATE_LIMITS = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  signup: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
};

class ClientRateLimiter {
  private getRecord(key: string): RateLimitRecord {
    const stored = localStorage.getItem(`ratelimit:${key}`);
    if (!stored) return { attempts: [] };
    
    try {
      return JSON.parse(stored);
    } catch {
      return { attempts: [] };
    }
  }

  private setRecord(key: string, record: RateLimitRecord): void {
    localStorage.setItem(`ratelimit:${key}`, JSON.stringify(record));
  }

  private cleanOldAttempts(attempts: number[], windowMs: number): number[] {
    const now = Date.now();
    return attempts.filter(timestamp => now - timestamp < windowMs);
  }

  check(action: 'login' | 'signup', identifier: string): {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  } {
    const config = RATE_LIMITS[action];
    const key = `${action}:${identifier}`;
    const record = this.getRecord(key);

    // Check if currently blocked
    if (record.blockedUntil && Date.now() < record.blockedUntil) {
      return {
        success: false,
        limit: config.maxAttempts,
        remaining: 0,
        reset: record.blockedUntil,
      };
    }

    // Clean old attempts
    const cleanAttempts = this.cleanOldAttempts(record.attempts, config.windowMs);
    const remaining = config.maxAttempts - cleanAttempts.length;

    if (remaining <= 0) {
      // Block user
      const blockedUntil = Date.now() + config.windowMs;
      this.setRecord(key, {
        attempts: cleanAttempts,
        blockedUntil,
      });

      return {
        success: false,
        limit: config.maxAttempts,
        remaining: 0,
        reset: blockedUntil,
      };
    }

    // Add current attempt
    cleanAttempts.push(Date.now());
    this.setRecord(key, { attempts: cleanAttempts });

    // Calculate reset time (when oldest attempt expires)
    const oldestAttempt = cleanAttempts[0];
    const reset = oldestAttempt + config.windowMs;

    return {
      success: true,
      limit: config.maxAttempts,
      remaining: remaining - 1, // -1 because we just added an attempt
      reset,
    };
  }

  reset(action: 'login' | 'signup', identifier: string): void {
    const key = `${action}:${identifier}`;
    localStorage.removeItem(`ratelimit:${key}`);
  }
}

export const clientRateLimiter = new ClientRateLimiter();

// Helper function to get client identifier
export const getClientIdentifier = (): string => {
  let sessionId = sessionStorage.getItem('rate_limit_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    sessionStorage.setItem('rate_limit_session_id', sessionId);
  }
  return sessionId;
};

// Format time until reset
export const formatResetTime = (resetTimestamp: number): string => {
  const now = Date.now();
  const diff = resetTimestamp - now;
  
  if (diff <= 0) return 'maintenant';
  
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  
  return `${seconds} seconde${seconds > 1 ? 's' : ''}`;
};
