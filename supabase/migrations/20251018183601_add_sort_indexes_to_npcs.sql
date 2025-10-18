CREATE INDEX IF NOT EXISTS idx_npcs_updated_at ON public.npcs(updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_npcs_created_at ON public.npcs(created_at DESC) WHERE deleted_at IS NULL;
