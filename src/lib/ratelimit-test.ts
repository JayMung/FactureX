// Test file to verify Upstash configuration
export const testUpstashConfig = () => {
  const url = import.meta.env.VITE_UPSTASH_REDIS_REST_URL;
  const token = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN;

  console.log('🔍 Upstash Configuration Check:');
  console.log('URL exists:', !!url);
  console.log('URL value:', url ? url.substring(0, 30) + '...' : 'MISSING');
  console.log('Token exists:', !!token);
  console.log('Token value:', token ? token.substring(0, 20) + '...' : 'MISSING');

  if (!url || !token) {
    console.error('❌ Upstash credentials are missing!');
    console.error('Please check your .env file');
    return false;
  }

  console.log('✅ Upstash credentials are configured');
  return true;
};
