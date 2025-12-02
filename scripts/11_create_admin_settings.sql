-- Create t_admin_settings table for global application settings
CREATE TABLE IF NOT EXISTS public.t_admin_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add comment
COMMENT ON TABLE public.t_admin_settings IS 'Global application settings (e.g., MAIN_MISSION_ID)';

-- Enable RLS
ALTER TABLE public.t_admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policies (Only ADMIN can write, everyone can read)
-- Note: You might need to adjust the "ADMIN" check based on your auth implementation.
-- For now, we'll allow public read, and restrict write to authenticated users (assuming admin check is done in app logic or via custom claim)

CREATE POLICY "Enable read access for all users" ON public.t_admin_settings
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.t_admin_settings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.t_admin_settings
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Insert initial empty setting for MAIN_MISSION_ID if not exists
INSERT INTO public.t_admin_settings (key, value)
VALUES ('MAIN_MISSION_ID', 'null'::jsonb)
ON CONFLICT (key) DO NOTHING;
