CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  provider_message_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert notification_logs"
  ON notification_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can read notification_logs"
  ON notification_logs FOR SELECT
  TO service_role
  USING (true);

CREATE INDEX IF NOT EXISTS idx_notification_logs_tenant_id
  ON notification_logs (tenant_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_event_type
  ON notification_logs (event_type);

CREATE INDEX IF NOT EXISTS idx_notification_logs_status
  ON notification_logs (status);

CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at
  ON notification_logs (created_at DESC);


