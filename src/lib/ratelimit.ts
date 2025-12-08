import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis client
const redis = new Redis({
  url: import.meta.env.VITE_UPSTASH_REDIS_REST_URL,
  token: import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN,
});

// Rate limiters for different use cases
export const rateLimiters = {
  // Login attempts: 5 attempts per 15 minutes per IP
  login: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    analytics: true,
    prefix: "ratelimit:login",
  }),

  // Password reset: 3 attempts per hour per email
  passwordReset: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    analytics: true,
    prefix: "ratelimit:password-reset",
  }),

  // API calls: 100 requests per minute per user
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    analytics: true,
    prefix: "ratelimit:api",
  }),

  // Signup: 3 signups per hour per IP
  signup: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    analytics: true,
    prefix: "ratelimit:signup",
  }),
};

// Helper function to get client IP (fallback for development)
export const getClientIdentifier = (): string => {
  // In production with a reverse proxy, you'd use the real IP
  // For now, we'll use a combination of user agent and a random session ID
  if (typeof window === 'undefined') return 'server';
  
  // Try to get a stored session ID or create one
  let sessionId = sessionStorage.getItem('rate_limit_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    sessionStorage.setItem('rate_limit_session_id', sessionId);
  }
  
  return sessionId;
};

// Check rate limit and return result
export const checkRateLimit = async (
  limiter: Ratelimit,
  identifier: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> => {
  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);
    
    return {
      success,
      limit,
      remaining,
      reset,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // On error, allow the request but log it
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
    };
  }
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
