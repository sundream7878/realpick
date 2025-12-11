-- Create t_notifications table
CREATE TABLE IF NOT EXISTS t_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('INFO', 'MISSION', 'SYSTEM', 'WIN', 'LOSS')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for querying user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON t_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON t_notifications(created_at DESC);

-- Enable RLS for t_notifications
ALTER TABLE t_notifications ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON t_notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS: Only system/admins can insert (or via special functions)
-- Generally, we might want a function for sending notifications, or allow specific service roles.
-- For now, we'll allow users to READ only, and maybe update 'is_read'.
CREATE POLICY "Users can update own notifications" ON t_notifications
    FOR UPDATE
    USING (auth.uid() = user_id);


-- Create t_push_subscriptions table
CREATE TABLE IF NOT EXISTS t_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE t_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS: Users can manage their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON t_push_subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON t_push_subscriptions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" ON t_push_subscriptions
    FOR DELETE
    USING (auth.uid() = user_id);
