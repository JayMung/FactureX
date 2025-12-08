// Test file for server-side rate limiting
// This file can be used to test the rate limiting implementation

import { serverRateLimiter, getClientIdentifier } from './rate-limit-server';

export async function testRateLimit() {
  console.log('Testing server-side rate limiting...');
  
  const identifier = getClientIdentifier();
  console.log('Using identifier:', identifier);
  
  try {
    // Test login rate limiting
    console.log('\n=== Testing Login Rate Limit ===');
    
    for (let i = 1; i <= 7; i++) {
      const result = await serverRateLimiter.check('login', identifier);
      console.log(`Attempt ${i}:`, {
        success: result.success,
        remaining: result.remaining,
        limit: result.limit,
        reset: new Date(result.reset).toLocaleTimeString()
      });
      
      if (!result.success) {
        console.log('Rate limit activated as expected!');
        break;
      }
      
      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Test signup rate limiting
    console.log('\n=== Testing Signup Rate Limit ===');
    
    for (let i = 1; i <= 5; i++) {
      const result = await serverRateLimiter.check('signup', identifier);
      console.log(`Attempt ${i}:`, {
        success: result.success,
        remaining: result.remaining,
        limit: result.limit,
        reset: new Date(result.reset).toLocaleTimeString()
      });
      
      if (!result.success) {
        console.log('Rate limit activated as expected!');
        break;
      }
      
      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
  } catch (error) {
    console.error('Rate limit test failed:', error);
  }
}

// Uncomment to test in browser console
// testRateLimit();
