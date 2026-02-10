-- Add category_id to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES finance_categories(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
