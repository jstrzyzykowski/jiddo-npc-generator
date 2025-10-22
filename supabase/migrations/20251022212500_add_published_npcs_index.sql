CREATE INDEX IF NOT EXISTS idx_npcs_published_status_and_date
ON public.npcs(status, published_at DESC)
WHERE deleted_at IS NULL;
