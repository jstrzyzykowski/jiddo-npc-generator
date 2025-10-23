-- migration: fix_protect_generation_job_fields_search_path
-- purpose: explicitly set the search_path on the security definer function to resolve a supabase security warning
-- affects: function public.protect_generation_job_fields

CREATE OR REPLACE FUNCTION public.protect_generation_job_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
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
