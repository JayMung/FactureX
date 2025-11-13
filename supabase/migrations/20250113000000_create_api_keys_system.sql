-- ============================================================================
-- API Keys System for FactureX External API
-- Migration: 20250113000000_create_api_keys_system.sql
-- ============================================================================

-- ============================================================================
-- 1. API Keys Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of the API key
  key_prefix TEXT NOT NULL, -- pk_live_, sk_live_, ak_live_
  type TEXT NOT NULL CHECK (type IN ('public', 'secret', 'admin')),
  permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  
  -- Indexes
  CONSTRAINT api_keys_name_org_unique UNIQUE (organization_id, name)
);

-- Indexes for performance
CREATE INDEX idx_api_keys_organization ON api_keys(organization_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active) WHERE is_active = true;
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- 2. Webhooks Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  format TEXT NOT NULL DEFAULT 'json' CHECK (format IN ('json', 'discord', 'slack', 'n8n')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  secret TEXT, -- For HMAC signature verification
  filters JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER NOT NULL DEFAULT 0,
  
  -- Constraints
  CONSTRAINT webhooks_name_org_unique UNIQUE (organization_id, name)
);

-- Indexes
CREATE INDEX idx_webhooks_organization ON webhooks(organization_id);
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active) WHERE is_active = true;
CREATE INDEX idx_webhooks_events ON webhooks USING GIN(events);

-- ============================================================================
-- 3. API Audit Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance and analytics
CREATE INDEX idx_api_audit_logs_organization ON api_audit_logs(organization_id);
CREATE INDEX idx_api_audit_logs_api_key ON api_audit_logs(api_key_id);
CREATE INDEX idx_api_audit_logs_created_at ON api_audit_logs(created_at DESC);
CREATE INDEX idx_api_audit_logs_endpoint ON api_audit_logs(endpoint);
CREATE INDEX idx_api_audit_logs_status_code ON api_audit_logs(status_code);

-- ============================================================================
-- 4. Webhook Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_organization ON webhook_logs(organization_id);
CREATE INDEX idx_webhook_logs_triggered_at ON webhook_logs(triggered_at DESC);
CREATE INDEX idx_webhook_logs_event ON webhook_logs(event);

-- ============================================================================
-- 5. RLS Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- API Keys Policies
CREATE POLICY "Users can view their organization's API keys"
  ON api_keys FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can create API keys"
  ON api_keys FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update API keys"
  ON api_keys FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can delete API keys"
  ON api_keys FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- Webhooks Policies (similar to API keys)
CREATE POLICY "Users can view their organization's webhooks"
  ON webhooks FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage webhooks"
  ON webhooks FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- Audit Logs Policies (read-only for admins)
CREATE POLICY "Admins can view API audit logs"
  ON api_audit_logs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- Webhook Logs Policies
CREATE POLICY "Admins can view webhook logs"
  ON webhook_logs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- ============================================================================
-- 6. Helper Functions
-- ============================================================================

-- Function to clean up expired API keys
CREATE OR REPLACE FUNCTION cleanup_expired_api_keys()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM api_keys
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND is_active = true
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get API usage statistics
CREATE OR REPLACE FUNCTION get_api_usage_stats(
  p_organization_id UUID,
  p_period_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  endpoint TEXT,
  total_requests BIGINT,
  success_rate NUMERIC,
  avg_response_time NUMERIC,
  error_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.endpoint,
    COUNT(*) as total_requests,
    ROUND(
      (COUNT(*) FILTER (WHERE l.status_code < 400)::NUMERIC / COUNT(*)::NUMERIC) * 100,
      2
    ) as success_rate,
    ROUND(AVG(l.response_time_ms)::NUMERIC, 2) as avg_response_time,
    COUNT(*) FILTER (WHERE l.status_code >= 400) as error_count
  FROM api_audit_logs l
  WHERE l.organization_id = p_organization_id
  AND l.created_at > NOW() - (p_period_hours || ' hours')::INTERVAL
  GROUP BY l.endpoint
  ORDER BY total_requests DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Triggers
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. Comments
-- ============================================================================

COMMENT ON TABLE api_keys IS 'API keys for external API access';
COMMENT ON TABLE webhooks IS 'Webhook configurations for event notifications';
COMMENT ON TABLE api_audit_logs IS 'Audit trail for all API requests';
COMMENT ON TABLE webhook_logs IS 'Log of all webhook deliveries';

COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the API key (never store plain keys)';
COMMENT ON COLUMN api_keys.key_prefix IS 'Key prefix for identification (pk_live_, sk_live_, ak_live_)';
COMMENT ON COLUMN api_keys.permissions IS 'Array of permission strings (e.g., read:transactions, write:webhooks)';

COMMENT ON COLUMN webhooks.secret IS 'Secret for HMAC signature verification (optional)';
COMMENT ON COLUMN webhooks.filters IS 'JSON filters to apply before triggering webhook';
COMMENT ON COLUMN webhooks.failure_count IS 'Number of consecutive failures (for auto-disable)';

-- ============================================================================
-- 9. Initial Data (Optional)
-- ============================================================================

-- You can add default API key permissions here if needed
-- Example: INSERT INTO api_key_permissions (name, description) VALUES ...

-- ============================================================================
-- End of Migration
-- ============================================================================
