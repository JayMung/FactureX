-- Create user_notification_preferences table with secure RLS
-- This fixes the IDOR vulnerability where users could access other users' notification preferences

-- Create the table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enable_notifications BOOLEAN DEFAULT true,
  enable_browser_notifications BOOLEAN DEFAULT false,
  notify_on_creation BOOLEAN DEFAULT true,
  notify_on_modification BOOLEAN DEFAULT true,
  notify_on_deletion BOOLEAN DEFAULT true,
  notify_on_auth BOOLEAN DEFAULT false,
  notify_on_settings BOOLEAN DEFAULT true,
  notify_on_client_activity BOOLEAN DEFAULT true,
  notify_on_transaction_activity BOOLEAN DEFAULT true,
  notify_on_user_activity BOOLEAN DEFAULT true,
  notify_only_own_activities BOOLEAN DEFAULT false,
  notify_only_important BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint on user_id (one preference set per user)
ALTER TABLE user_notification_preferences 
ADD CONSTRAINT unique_user_notification_preferences 
UNIQUE (user_id);

-- Enable RLS
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create secure RLS policies
-- Users can only view their own preferences
CREATE POLICY "Users can view their own notification preferences" ON user_notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own preferences
CREATE POLICY "Users can insert their own notification preferences" ON user_notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own preferences
CREATE POLICY "Users can update their own notification preferences" ON user_notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own preferences
CREATE POLICY "Users can delete their own notification preferences" ON user_notification_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Add comments
COMMENT ON TABLE user_notification_preferences IS 'User notification preferences with strict RLS policies to prevent IDOR attacks';
COMMENT ON POLICY "Users can view their own notification preferences" ON user_notification_preferences IS 'IDOR protection: users can only see their own preferences';
COMMENT ON POLICY "Users can insert their own notification preferences" ON user_notification_preferences IS 'IDOR protection: users can only insert their own preferences';
COMMENT ON POLICY "Users can update their own notification preferences" ON user_notification_preferences IS 'IDOR protection: users can only update their own preferences';
COMMENT ON POLICY "Users can delete their own notification preferences" ON user_notification_preferences IS 'IDOR protection: users can only delete their own preferences';
