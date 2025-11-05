-- Make mode_paiement nullable in transactions table
-- Not all transaction types require a payment method (e.g., internal transfers)

ALTER TABLE transactions 
  ALTER COLUMN mode_paiement DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN transactions.mode_paiement IS 
  'Payment method (optional). Required for revenue transactions, optional for transfers and expenses.';
