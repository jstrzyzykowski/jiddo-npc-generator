-- Krok 1: Stworzenie nowego typu ENUM dla statusu zadania
CREATE TYPE public.generation_job_status AS ENUM (
    'queued',
    'processing',
    'succeeded',
    'failed'
);

-- Krok 2: Zmiana struktury tabeli npcs - dodanie nowych kolumn
ALTER TABLE public.npcs
ADD COLUMN generation_job_id UUID NULL,
ADD COLUMN generation_job_status public.generation_job_status NULL,
ADD COLUMN generation_job_started_at TIMESTAMPTZ NULL,
ADD COLUMN generation_job_error JSONB NULL;

-- Krok 3: Dodanie komentarzy dla nowych kolumn (dobra praktyka)
COMMENT ON COLUMN public.npcs.generation_job_id IS 'ID ostatniego zadania generacji XML.';
COMMENT ON COLUMN public.npcs.generation_job_status IS 'Status zadania: queued, processing, succeeded, failed.';
COMMENT ON COLUMN public.npcs.generation_job_started_at IS 'Timestamp rozpoczęcia zadania.';
COMMENT ON COLUMN public.npcs.generation_job_error IS 'Szczegóły błędu w przypadku niepowodzenia generacji.';

-- Krok 4: Dodanie indeksów dla optymalizacji zapytań
CREATE INDEX IF NOT EXISTS idx_npcs_generation_job_id
ON public.npcs (generation_job_id);

CREATE INDEX IF NOT EXISTS idx_npcs_generation_job_status_started_at
ON public.npcs (generation_job_status, generation_job_started_at);

-- Krok 5: Stworzenie funkcji triggera do ochrony kolumn
CREATE OR REPLACE FUNCTION public.protect_generation_job_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  -- Zezwól na wszystkie zmiany, jeśli operacja jest wykonywana przez rolę serwisową (backend)
  IF (auth.role() = 'service_role') THEN
    RETURN NEW;
  END IF;

  -- Dla zwykłych uwierzytelnionych użytkowników, sprawdź czy próbują zmienić chronione kolumny
  IF
    NEW.generation_job_id IS DISTINCT FROM OLD.generation_job_id OR
    NEW.generation_job_status IS DISTINCT FROM OLD.generation_job_status OR
    NEW.generation_job_started_at IS DISTINCT FROM OLD.generation_job_started_at OR
    NEW.generation_job_error IS DISTINCT FROM OLD.generation_job_error
  THEN
    -- Jeśli tak, zablokuj operację i rzuć błąd
    RAISE EXCEPTION 'Modification of generation job fields is not allowed.';
  END IF;

  -- Jeśli żadne chronione pole nie zostało zmienione, zezwól na aktualizację
  RETURN NEW;
END;
$$;

-- Krok 6: Stworzenie triggera używającego powyższej funkcji
CREATE TRIGGER before_npcs_update_protect_job_fields
  BEFORE UPDATE ON public.npcs
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_generation_job_fields();
