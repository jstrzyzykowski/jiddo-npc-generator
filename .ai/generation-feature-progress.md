# Generation Feature – Progress Snapshot (POST /generate)

## Zakres zrealizowany

- Dodano walidatory Zod (`parseTriggerNpcGenerationCommand`, `parseTriggerNpcGenerationQuery`) obejmujące body (`regenerate`, `currentXml`) oraz query (`force`).
- Rozszerzono `NpcService` o metodę `startGenerationJob` (walidacja właścicielstwa, blokada równoległych zadań, reset przy `force`, zapis statusu przez klienta service-role).
- Zsynchronizowano typy Supabase (`database.types.ts`) z migracją kolumn `generation_job_*` oraz enuma `generation_job_status`; uzupełniono `Constants` o nowe wartości.
- Zaimplementowano endpoint `POST /api/npcs/{npcId}/generate`:
  - Walidacja parametrów ścieżki, query i ciała.
  - Mapowanie błędów serwisowych (401/404/409/500) i logowanie.
  - Odpowiedź `202` z `TriggerNpcGenerationResponseDto`.
- Przygotowano plan testów manualnych dla endpointu (scenariusze happy path, walidacje, konflikty, błędy infrastruktury).

## TODO / przekazanie dla zespołu

- Implementacja `GET /api/npcs/{npcId}/generation-jobs/{jobId}` zgodnie z MVP (mockowany sukces po ~3 s, zwrot XML z pliku).
- Zasilenie UI logiką pollingu po wdrożeniu endpointu GET (obecnie backend gotowy do wywołań POST).
- Przygotowanie mockowanego przepływu w GET powinno wykorzystać istniejącą migrację (`generation_job_*` + trigger) – schema jest już zaktualizowana w repo.
- Warto dodać prosty helper (np. util liczący upływ czasu od `generation_job_started_at`), który pozwoli rozstrzygać, czy zwracamy status `processing`, czy już `succeeded` i wczytujemy mockowany XML.

## Uwagi techniczne

- Endpoint POST wymaga ważnej sesji Supabase (middleware Astro przekazuje `locals.session`).
- Kolumny `generation_job_*` chronione triggerem w DB – do zapisu wymagany `SUPABASE_SECRET_KEY` (service-role). Klient w serwisie wykorzystuje wspólną instancję cache’owaną.
- `force=true` pomija konflikt aktywnego zadania; w innym razie otrzymamy `409 GENERATION_JOB_CONFLICT`.
- `currentXml` przechowywane w DTO jedynie informacyjnie; obecnie logika generacji nie używa danych z ciała (docelowo posłuży do heurystyk w fazie 2).
