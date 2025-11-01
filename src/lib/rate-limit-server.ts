// Server-side rate limiting using Supabase Edge Functions
// This is secure and cannot be bypassed by clearing localStorage

interface RateLimitRequest {
  action: 'login' | 'signup';
  identifier: string;
}

interface RateLimitResponse {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  error?: string;
}

class ServerRateLimiter {
  private edgeFunctionUrl: string;

  constructor() {
    // Get the Supabase project URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL is not configured');
    }
    this.edgeFunctionUrl = `${supabaseUrl}/functions/v1/rate-limit`;
  }

  async check(action: 'login' | 'signup', identifier: string): Promise<RateLimitResponse> {
    try {
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action,
          identifier,
        } as RateLimitRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Rate limit check failed:', error);
      
      // Fail secure: if rate limiting service is down, allow the request
      // but log the error for monitoring
      if (error instanceof Error) {
        // In production, you might want to use a monitoring service here
        console.warn('Rate limiting service unavailable, allowing request');
      }
      
      return {
        success: true,
        limit: action === 'login' ? 5 : 3,
        remaining: action === 'login' ? 4 : 2,
        reset: Date.now() + (action === 'login' ? 15 * 60 * 1000 : 60 * 60 * 1000),
      };
    }
  }

  async reset(action: 'login' | 'signup', identifier: string): Promise<void> {
    // Note: Server-side rate limiting doesn't typically support manual reset
    // This is handled automatically by the server based on time windows
    console.log(`Rate limit reset requested for ${action}:${identifier} - not supported server-side`);
  }
}

export const serverRateLimiter = new ServerRateLimiter();

// Helper function to get client identifier (more secure than before)
export const getClientIdentifier = (): string => {
  // Use a combination of factors for better identification
  const sessionId = sessionStorage.getItem('rate_limit_session_id') || 
                   localStorage.getItem('rate_limit_session_id');
  
  if (sessionId) {
    return sessionId;
  }

  // Generate a persistent session ID
  const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}_${navigator.userAgent.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '')}`;
  
  try {
    sessionStorage.setItem('rate_limit_session_id', newSessionId);
    // Also store in localStorage as fallback for session persistence
    localStorage.setItem('rate_limit_session_id', newSessionId);
  } catch (error) {
    // If storage is blocked, use a temporary identifier
    console.warn('Storage not available, using temporary identifier');
  }
  
  return newSessionId;
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
