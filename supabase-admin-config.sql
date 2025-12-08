-- Create t_admin_config table for storing admin settings
CREATE TABLE IF NOT EXISTS t_admin_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE t_admin_config ENABLE ROW LEVEL SECURITY;

-- Policy: Only Admins can view/edit
CREATE POLICY "Admins can view config" ON t_admin_config
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM t_users
            WHERE t_users.f_id = auth.uid()
            AND t_users.f_role = 'ADMIN'
        )
    );

CREATE POLICY "Admins can update config" ON t_admin_config
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM t_users
            WHERE t_users.f_id = auth.uid()
            AND t_users.f_role = 'ADMIN'
        )
    );
