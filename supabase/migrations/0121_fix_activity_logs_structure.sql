-- Fix activity_logs table structure
-- Add created_at column if it doesn't exist, and create index

DO $$
BEGIN
    -- Check if created_at column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_logs' 
        AND column_name = 'created_at'
    ) THEN
        -- Add created_at column and copy values from date column
        ALTER TABLE public.activity_logs 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Update created_at with existing date values
        UPDATE public.activity_logs 
        SET created_at = date 
        WHERE created_at IS NULL;
        
        -- Make created_at not null
        ALTER TABLE public.activity_logs 
        ALTER COLUMN created_at SET NOT NULL;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_logs' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.activity_logs 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create index on created_at for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs (user_id);

-- Verify the structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'activity_logs' 
AND table_schema = 'public'
ORDER BY ordinal_position;