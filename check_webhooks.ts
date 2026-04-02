import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function checkLogs() {
  const { data, error } = await supabase
    .from('webhook_logs')
    .select('*')
    .order('triggered_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching logs:", error);
  } else {
    console.log("Recent webhook logs:", JSON.stringify(data, null, 2));
  }
}

checkLogs();
