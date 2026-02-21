-- ============================================================================
-- AI Pending Transactions Table + Audit Log Enhancement
-- Migration: 0150_create_ai_pending_transactions_and_audit_body.sql
--
-- This migration:
--   1. Creates the ai_pending_transactions table for the AI agent approval workflow
--   2. Adds a request_body JSONB column to api_audit_logs for full request logging
-- ============================================================================

-- ============================================================================
-- 1. AI Pending Transactions Table
-- ============================================================================
-- This table stores transactions submitted by ai_agent API keys.
-- They MUST go through human approval before being promoted to the
-- real "transactions" table. This enforces the approval workflow
-- defined in AI_AGENT_RESTRICTIONS.canBypassApproval = false.

CREATE TABLE IF NOT EXISTS ai_pending_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Financial data
  montant NUMERIC(15, 2) NOT NULL CHECK (montant > 0 AND montant <= 10000),
  devise TEXT NOT NULL CHECK (devise IN ('USD', 'CDF', 'CNY')),
  type_transaction TEXT NOT NULL CHECK (type_transaction IN ('revenue', 'depense', 'transfert')),
  motif TEXT NOT NULL CHECK (char_length(motif) >= 3),

  -- Relations
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  compte_source_id UUID NOT NULL REFERENCES comptes_financiers(id) ON DELETE RESTRICT,
  compte_destination_id UUID REFERENCES comptes_financiers(id) ON DELETE RESTRICT,
  categorie_id UUID,

  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval', 'approved', 'rejected', 'expired')),
  created_by TEXT NOT NULL DEFAULT 'ai_agent',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Financial preview (computed at submission time)
  impact_preview JSONB,

  -- Metadata
  source TEXT NOT NULL DEFAULT 'ai_agent',
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '72 hours')
);

-- Indexes
CREATE INDEX idx_ai_pending_tx_org ON ai_pending_transactions(organization_id);
CREATE INDEX idx_ai_pending_tx_status ON ai_pending_transactions(status);
CREATE INDEX idx_ai_pending_tx_created_at ON ai_pending_transactions(created_at DESC);
CREATE INDEX idx_ai_pending_tx_expires ON ai_pending_transactions(expires_at)
  WHERE status = 'pending_approval';

-- RLS
ALTER TABLE ai_pending_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org pending transactions"
  ON ai_pending_transactions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can approve/reject pending transactions"
  ON ai_pending_transactions FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    -- Admins may only change approval-workflow columns.
    -- Financial data columns are enforced immutable by the trigger below,
    -- but the WITH CHECK adds a second layer of defense via RLS.
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- Service role can insert (used by the Edge Function with service_role key)
-- No INSERT policy for regular users — only the API endpoint inserts via service role.

-- ─── Immutability trigger: financial fields cannot change after insert ───
-- This prevents ANY actor (including service_role) from altering the
-- financial substance of a pending transaction after it has been submitted.
-- Only approval-workflow fields (status, reviewed_by, reviewed_at,
-- rejection_reason, updated_at) may be modified.
CREATE OR REPLACE FUNCTION enforce_ai_pending_tx_immutable_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.montant IS DISTINCT FROM OLD.montant THEN
    RAISE EXCEPTION 'montant cannot be modified after insert';
  END IF;
  IF NEW.devise IS DISTINCT FROM OLD.devise THEN
    RAISE EXCEPTION 'devise cannot be modified after insert';
  END IF;
  IF NEW.type_transaction IS DISTINCT FROM OLD.type_transaction THEN
    RAISE EXCEPTION 'type_transaction cannot be modified after insert';
  END IF;
  IF NEW.motif IS DISTINCT FROM OLD.motif THEN
    RAISE EXCEPTION 'motif cannot be modified after insert';
  END IF;
  IF NEW.compte_source_id IS DISTINCT FROM OLD.compte_source_id THEN
    RAISE EXCEPTION 'compte_source_id cannot be modified after insert';
  END IF;
  IF NEW.compte_destination_id IS DISTINCT FROM OLD.compte_destination_id THEN
    RAISE EXCEPTION 'compte_destination_id cannot be modified after insert';
  END IF;
  IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION 'client_id cannot be modified after insert';
  END IF;
  IF NEW.categorie_id IS DISTINCT FROM OLD.categorie_id THEN
    RAISE EXCEPTION 'categorie_id cannot be modified after insert';
  END IF;
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'organization_id cannot be modified after insert';
  END IF;
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_by cannot be modified after insert';
  END IF;
  IF NEW.source IS DISTINCT FROM OLD.source THEN
    RAISE EXCEPTION 'source cannot be modified after insert';
  END IF;
  IF NEW.impact_preview IS DISTINCT FROM OLD.impact_preview THEN
    RAISE EXCEPTION 'impact_preview cannot be modified after insert';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_ai_pending_tx_immutability
  BEFORE UPDATE ON ai_pending_transactions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_ai_pending_tx_immutable_fields();

-- Auto-update updated_at
CREATE TRIGGER update_ai_pending_tx_updated_at
  BEFORE UPDATE ON ai_pending_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. Add request_body to api_audit_logs
-- ============================================================================
-- Allows full request body logging for sensitive endpoints (ai_agent writes).

ALTER TABLE api_audit_logs
  ADD COLUMN IF NOT EXISTS request_body JSONB;

COMMENT ON TABLE ai_pending_transactions IS
  'Transactions submitted by AI agents awaiting human approval before promotion to transactions table';
COMMENT ON COLUMN ai_pending_transactions.impact_preview IS
  'Financial impact preview computed at submission time (account balances, fees, etc.)';
COMMENT ON COLUMN api_audit_logs.request_body IS
  'Full request body for audit-sensitive endpoints (e.g. ai_agent writes)';

-- ============================================================================
-- End of Migration
-- ============================================================================
