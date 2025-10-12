# Dokument wymagań produktu (PRD) - Jiddo NPC Generator

## 1. Przegląd produktu

Jiddo NPC Generator to aplikacja ułatwiająca projektowanie i generowanie plików NPC dla serwerów Open Tibia w systemie Jiddo (TFS ≤ 1.5). Celem jest znaczące skrócenie czasu tworzenia NPC przez eliminację ręcznego pisania plików XML i skryptów LUA w przypadku prostych zastosowań. W MVP AI generuje wyłącznie plik XML na podstawie wprowadzonych parametrów, a skrypt LUA jest wspólnym domyślnym plikiem default.lua; aplikacja nie udostępnia edycji manualnej XML ani Lua.

Grupy użytkowników:

- Scripter/Content Designer: tworzy i edytuje NPC w kreatorze, publikuje gotowe NPC do użytku.
- Mapper/Admin: przegląda katalog NPC, kopiuje XML/LUA do integracji w datapacku/RME.

Zakres MVP (skrót):

- Uwierzytelnianie: Supabase Magic Links (bez hasła), TTL 15 min, sesja 7 dni, redirect po logowaniu.
- Kreator NPC: edytowalne parametry Jiddo; aktywne moduły Shop i Keywords; pozostałe moduły widoczne, ale nieaktywne.
- Generowanie AI: tylko XML; default.lua jako stały, wspólny skrypt, podgląd w UI; brak edycji manualnej zawartości XML oraz Lua w aplikacji.
- Publikacja: utworzony NPC jest prywatny; Publikuj czyni go publicznym. Brak cofania publikacji (unpublish) w MVP.
- Katalog publiczny: HOME (Featured 10) + /npcs (SSR 100, infinite scroll).
- Strona szczegółów NPC: metadane + podglądy XML/LUA (tekst, escapowany) + kopiowanie (przyciski kopiowania do schowka).
- Shop (MVP): aktywny moduł; formularz buy/sell; limit ~255 pozycji; tryb trade window lub talk mode.
- Keywords (MVP): aktywny moduł; frazy i odpowiedzi, limity i walidacje.
- Telemetria: NPC Created, NPC Published; metryki TTFNPC i konwersja Create→Publish.

Technologia (wysoki poziom, kontekst implementacyjny): Astro 5, TypeScript 5, React 19, Tailwind 4, shadcn/ui, Supabase (auth i storage), AI provider (np. OpenRouter) do generacji XML.

Decyzje kluczowe:

- System NPC wyłącznie Jiddo (TFS ≤ 1.5) w MVP.
- Brak generacji LUA per-NPC w MVP; default.lua jest wspólny.
- Brak wersjonowania edycji; edycja nadpisuje treść.
- Brak funkcji Manual Edit w aplikacji; zmiany ręczne użytkownik wykonuje we własnym zakresie poza aplikacją po skopiowaniu treści.

## 2. Problem użytkownika

Ręczne tworzenie pary plików (XML + LUA) dla Jiddo jest czasochłonne, podatne na błędy i pełne powtarzalnego boilerplate. Twórcy treści i administratorzy potrzebują szybkiego sposobu tworzenia prostych NPC (np. vendorów) w spójnej formie, z walidacją i gotowym do wklejenia XML, bez konieczności poznawania wszystkich detali składni. Aplikacja ma skrócić czas od pomysłu do działającego NPC do kilku minut i zredukować liczbę błędów oraz rozbieżności stylu.

## 3. Wymagania funkcjonalne

3.1 Uwierzytelnianie i sesje

- Logowanie przez Supabase Magic Link (bez hasła), TTL linku 15 minut, sesja ważna 7 dni.
- Po pomyślnym logowaniu redirect na stronę główną lub ostatnio odwiedzaną stronę.
- Wylogowanie dostępne z poziomu UI; odświeżenie sesji bez przerywania pracy w kreatorze.
- Dostęp do tworzenia (kreator NPC)/edycji/publikacji/soft delete wyłącznie dla zalogowanych.

  3.2 Model publikacji i uprawnień

- Utworzenie NPC tworzy wersję prywatną widoczną tylko dla właściciela.
- Publikuj ujawnia NPC publicznie; brak Unpublish w MVP (usunięcie wyłącznie przez soft delete).
- Edycja opublikowanego NPC wymaga potwierdzenia, a wynik jest widoczny publicznie po zapisie.
- Edycja i soft delete dozwolone wyłącznie dla właściciela; inni mają dostęp tylko do widoku publicznego.

  3.3 Kreator NPC (Jiddo)

- Układ: panel parametrów (aside panel) oraz dwa podglądy (XML aktywny, Lua tylko podgląd default.lua), akcje kreatora w sticky bottom, w kolejnych wersjach podgląd wizualny NPC (2D wygląd NPC, outfit, addons, kolory).
- System: input typu select z jedną stałą opcją Jiddo (TFS ≤1.5).
- Podstawy: name, script (text input i disabled z wartością default.lua), walkinterval, floorchange, health (now/max).
- Wygląd: select look type; dla player outfits: head, body, legs, feet, addons.
- Komunikaty: textarea greet, farewell, decline, noshop, oncloseshop.
- Moduły: checkboxy Focus/Travel/Voice (widoczne, nieaktywne), Shop (aktywny), Keywords (aktywny).

  3.3.1 Shop (aktywny)

- Tryb definicji: XML listy (aktywny) vs Lua (ShopModule API) widoczne, ale wyłączone w MVP.
- Listy buy/sell: pola name, itemId, price, subType/charges; opcjonalnie container/realName.
- Tryb interfejsu: trade window vs talk mode. Wybranie "talk mode" rezerwuje standardowe frazy (np. "trade", "buy", "sell", "shop"), które stają się niedostępne w module Keywords.
- Komunikaty sklepu z walidacją długości i znaków.
- Limit około 255 pozycji na listę.

  3.3.2 Keywords (aktywny)

- Tryb definicji: XML (aktywny) vs Lua (keywordHandler:addKeyword) widoczne, ale wyłączone w MVP.
- Wpis keyword składa się z:
  - fraz wyzwalających (co najmniej 1; dopuszczalne synonimy),
  - odpowiedzi NPC (tekst),
- Limity i walidacje:
  - maksymalnie około 255 wpisów keywords,
  - fraza 1–64 znaki; brak duplikatów w ramach jednego NPC (po normalizacji wielkości liter),
  - odpowiedź do 512 znaków; treści escapowane w podglądzie,
  - walidacja krzyżowa: aplikacja uniemożliwia dodanie frazy, która jest zarezerwowana przez moduł Shop w trybie "talk mode".

    3.4 Generowanie i edycja treści

- Utwórz wysyła parametry do AI; AI zwraca spójny plik XML Jiddo; Lua pozostaje default.lua.
- Edytuj wysyła aktualne parametry + bieżące XML; AI zwraca zaktualizowany XML.
- Brak edycji manualnej XML ani Lua w aplikacji; użytkownik może skopiować treść i modyfikować ją poza aplikacją.

  3.5 Podglądy i kopiowanie

- Podgląd XML i podgląd default.lua wyświetlane jako zwykły tekst (escapowany) z przyciskiem kopiowania do schowka.
- Limit rozmiaru treści 256 KB na pole; przekroczenie blokuje zapis i kopiowanie, z jasnym komunikatem o błędzie.
- Aplikacja nie oferuje edycji manualnej treści w podglądach.

  3.6 Listy i nawigacja

- HOME: sekcja Featured NPCs (10 najnowszych opublikowanych) + CTA Explore all NPCs.
- /npcs: SSR pierwszych 100 rekordów, dalej paginacja kursorowa (infinite scroll).
- Karty NPC: placeholder obrazu (4:3), nazwa, autor, aktywne moduły, implementation type (w MVP zawsze XML); cały kafelek klikalny.

  3.7 Strona szczegółów NPC

- Metadane: nazwa, autor, status (prywatny/publiczny), aktywne moduły.
- Podgląd XML oraz podgląd default.lua (read-only, escapowane), kopiowanie do schowka.
- Dla właściciela: akcje Edytuj, Publikuj, Soft delete.

  3.8 Walidacja danych i ograniczenia

- Walidacja na podstawie schematu (np. Zod): appearance.mode (player|monster|item) i zakresy (kolory 0–132, addons 0–3, type>0, typeEx>0).
- Shop: itemId/price wymagane, subType/charges liczby nieujemne, limit pozycji ~255.
- Keywords: limity i walidacje jak w 3.3.2 (frazy, duplikaty, odpowiedzi).
- Ograniczenia treści: 256 KB na pole; nazwy i komunikaty z limitami długości (zgodnie z UI/UX i bezpieczeństwem).
- Prewencja stanów nieprawidłowych: potwierdzenia dla edycji opublikowanych.
- Walidacja krzyżowa modułów: system zapobiega konfliktom fraz między modułami (np. Keywords vs Shop w trybie "talk mode").

  3.9 Telemetria i obserwowalność

- Zdarzenia: NPC Created, NPC Published.
- Metryki: TTFNPC (czas od wejścia do kreatora do pierwszego działającego NPC), konwersja Create→Publish, podstawowe wskaźniki błędów generacji.

## 4. Granice produktu

- Prywatność NPC (prywatne/publiczne): w MVP tylko model Create (prywatny) → Publish (publiczny); brak trybu unpublish.
- Brak pełnych UI dla Travel/Voice (widoczne jako przełączniki, bez konfiguratorów).
- Brak zaawansowanej logiki quest/storage/vocation/level gating (poza prostymi przykładami w Shop).
- Brak ocen/ratingów i średnich ocen.
- Brak filtrowania i wyszukiwania na liście NPC (poza domyślną nawigacją i infinite scroll).
- Brak resetowania hasła (auth tylko Magic Link).
- Brak mechanizmów share poza standardowym linkiem do strony.
- Brak importu/eksportu NPC (np. zip z XML+LUA).
- Brak wsparcia innych systemów NPC (np. RevNpcSys TFS 1.6+, Enhanced, OTX2) w MVP.
- Brak wersjonowania zmian; edycja nadpisuje treść.
- Brak edycji manualnej treści w aplikacji.

## 5. Historyjki użytkowników

US-001
Tytuł: Logowanie linkiem Magic Link
Opis: Jako użytkownik chcę otrzymać link logujący na e‑mail, aby zalogować się bez hasła.
Kryteria akceptacji:

- Formularz przyjmuje e‑mail i wysyła Magic Link z TTL 15 minut.
- Po wysłaniu wyświetla się informacja o wysłaniu linku.
- Błędny e‑mail lub błąd wysyłki prezentuje czytelny komunikat.

US-002
Tytuł: Wejście przez Magic Link
Opis: Jako użytkownik chcę zalogować się po kliknięciu w Magic Link, aby uzyskać dostęp do kreatora i moich NPC.
Kryteria akceptacji:

- Prawidłowy link loguje użytkownika i ustawia sesję na 7 dni.
- Wygasły lub nieważny link zwraca błąd i proponuje ponowne wysłanie.
- Po zalogowaniu następuje redirect na / lub ostatnio odwiedzaną stronę.

US-003
Tytuł: Utrzymanie i wylogowanie sesji
Opis: Jako użytkownik chcę, aby moja sesja trwała 7 dni oraz żebym mógł się wylogować.
Kryteria akceptacji:

- Sesja pozostaje aktywna przez 7 dni bez ponownego logowania.
- Wylogowanie czyści sesję i przekierowuje na / lub ekran logowania.
- Brak przerwania pracy w kreatorze podczas odświeżania sesji w tle.

US-004
Tytuł: Rozpoczęcie pracy w kreatorze NPC
Opis: Jako zalogowany użytkownik chcę otworzyć kreator Jiddo i widzieć panel parametrów oraz podglądy XML/LUA.
Kryteria akceptacji:

- Wyświetla się układ: parametry + podglądy (XML aktywny, Lua z default.lua).
- Focus/Travel/Voice są nieaktywne; Shop i Keywords aktywne.
- Przycisk Utwórz jest nieaktywny dopóki wymagane pola nie są kompletne.

US-005
Tytuł: Utworzenie NPC i generacja XML
Opis: Jako użytkownik chcę utworzyć NPC, aby AI wygenerowało spójny plik XML.
Kryteria akceptacji:

- Kliknięcie Utwórz wysyła parametry do AI; po sukcesie powstaje prywatny rekord NPC.
- XML z AI jest wyświetlany w podglądzie; Lua pokazuje default.lua.
- W przypadku błędu generacji pojawia się komunikat i możliwość ponowienia.

US-006
Tytuł: Edycja istniejącego NPC (AI poprawka XML)
Opis: Jako właściciel chcę edytować parametry i zlecić AI aktualizację XML.
Kryteria akceptacji:

- Kliknięcie Edytuj wysyła parametry + bieżące XML; AI zwraca zaktualizowany XML.
- Dla opublikowanego NPC wyświetla się potwierdzenie przed zapisaniem zmian.
- Po zapisie widać zaktualizowany XML; Lua pozostaje default.lua.

US-007
Tytuł: Publikacja NPC
Opis: Jako właściciel chcę opublikować gotowego NPC, aby był widoczny publicznie.
Kryteria akceptacji:

- Akcja Publikuj dostępna dla prywatnego NPC.
- Po publikacji NPC jest widoczny na HOME i /npcs.
- Brak opcji unpublish w MVP.

US-008
Tytuł: Soft delete NPC
Opis: Jako właściciel chcę miękko usunąć NPC, aby przestał być widoczny publicznie bez trwałego kasowania danych.
Kryteria akceptacji:

- Soft delete ukrywa NPC z list publicznych i strony szczegółów publicznej.
- Właściciel nie widzi NPC na swoich listach aktywnych; dane pozostają w systemie.
- Operacja nie ma opcji cofnięcia w MVP.

US-009
Tytuł: HOME – lista Featured 10
Opis: Jako odwiedzający chcę zobaczyć 10 najnowszych opublikowanych NPC na stronie głównej.
Kryteria akceptacji:

- Widoczne są 4:3 placeholdery, nazwa, autor, moduły, typ XML.
- Kafelek prowadzi do strony szczegółów NPC.
- Lista odświeża się po nowych publikacjach.

US-010
Tytuł: /npcs – przeglądanie z infinite scroll
Opis: Jako odwiedzający chcę przeglądać katalog opublikowanych NPC z SSR pierwszych 100 i dalszym ładowaniem.
Kryteria akceptacji:

- Pierwsze 100 rekordów SSR; kolejne strony ładują się kursorowo.
- Ładowanie nie duplikuje rekordów; koniec listy sygnalizowany komunikatem.
- Błędy sieciowe wyświetlają komunikat i umożliwiają ponowienie.

US-011
Tytuł: Strona szczegółów NPC (publiczna)
Opis: Jako odwiedzający chcę zobaczyć metadane i podglądy XML/LUA oraz móc skopiować treść.
Kryteria akceptacji:

- Podglądy są escapowane; kopiowanie działa dla obu paneli.
- Rozmiar treści >256 KB blokuje kopiowanie z jasnym komunikatem.
- Niedostępne są akcje właściciela (Edytuj/Publikuj/Soft delete).

US-012
Tytuł: Moduły w kreatorze (Shop i Keywords aktywne)
Opis: Jako użytkownik chcę widzieć moduły Focus/Travel/Voice oraz korzystać z aktywnych Shop i Keywords.
Kryteria akceptacji:

- Focus/Travel/Voice widoczne, ale nieedytowalne (disabled) w MVP.
- Shop i Keywords są aktywne i ich ustawienia są edytowalne.
- Zmiana modułów nie powoduje błędów walidacji pozostałych pól.

US-013
Tytuł: Shop – dodawanie pozycji buy/sell
Opis: Jako użytkownik chcę dodawać/usuwać/edytować pozycje buy i sell z walidacją.
Kryteria akceptacji:

- Pola: name, itemId, price, subType/charges; opcjonalnie container/realName.
- Walidacje: itemId i price obowiązkowe; wartości liczbowe nieujemne.
- Limit ~255 pozycji na listę; przekroczenie blokuje dodanie z komunikatem.

US-014
Tytuł: Shop – tryb interfejsu i komunikaty
Opis: Jako użytkownik chcę wybrać tryb handlu (trade window vs talk mode) i ustawić komunikaty sklepu.
Kryteria akceptacji:

- Przełącznik trybu zapisuje stan konsekwentnie w XML.
- Komunikaty sklepu są walidowane pod kątem długości/znaków.
- Podgląd XML odzwierciedla konfigurację po zapisie.

US-015
Tytuł: Walidacja pól i limit rozmiaru treści
Opis: Jako użytkownik chcę, aby formularz uniemożliwił wprowadzenie nieprawidłowych wartości i zbyt dużych treści.
Kryteria akceptacji:

- appearance.mode (player|monster|item), kolory 0–132, addons 0–3.
- type>0, typeEx>0, liczby całkowite tam, gdzie wymagane.
- Limit 256 KB na pole blokuje zapis i wyświetla komunikat.

US-016
Tytuł: Keywords – dodawanie/edycja/usuwanie wpisów
Opis: Jako użytkownik chcę tworzyć wpisy keywords z frazami i odpowiedzią.
Kryteria akceptacji:

- Można dodać, edytować i usunąć wpis; podgląd XML odświeża się po zapisie.
- Frazy nie są puste; brak duplikatów po normalizacji wielkości liter.

US-017
Tytuł: Keywords – walidacja i limity
Opis: Jako użytkownik nie chcę przekraczać limitów i chcę jasnych komunikatów walidacyjnych.
Kryteria akceptacji:

- Maksymalnie ~255 wpisów; próba przekroczenia limitu jest blokowana z komunikatem.
- Fraza 1–64 znaki; odpowiedź do 512; treści escapowane w podglądzie.
- Aplikacja blokuje próbę dodania frazy, która jest zarezerwowana przez moduł Shop, jeśli ten jest aktywny i ustawiony w tryb "talk mode".

US-018
Tytuł: Kopiowanie XML i default.lua do schowka
Opis: Jako użytkownik chcę szybko skopiować zawartości podglądów XML i Lua.
Kryteria akceptacji:

- Przyciski kopiowania działają dla obu paneli i sygnalizują sukces.
- Dla treści >256 KB kopiowanie jest zablokowane z komunikatem.
- Treść w podglądach jest zawsze escapowana.

US-019
Tytuł: Telemetria podstawowa
Opis: Jako produktowca interesują mnie zdarzenia służące do mierzenia użycia i jakości.
Kryteria akceptacji:

- Wysyłane są zdarzenia: NPC Created, NPC Published.
- Mierzony jest TTFNPC i konwersja Create→Publish.
- Błędy generacji AI są rejestrowane z minimalnym kontekstem (bez PII).

US-020
Tytuł: Błąd/wygaśnięcie Magic Link
Opis: Jako użytkownik chcę zobaczyć jasny komunikat, gdy link jest nieważny lub wygasł.
Kryteria akceptacji:

- Link po TTL 15 min zwraca błąd i proponuje wysłanie nowego.
- Nie dochodzi do zalogowania ani utworzenia sesji.
- Obsługa wielokrotnego kliknięcia linku nie powoduje błędów aplikacji.

US-021
Tytuł: Błąd generacji AI
Opis: Jako użytkownik chcę otrzymać komunikat, gdy AI nie zwróci poprawnego XML, i móc spróbować ponownie.
Kryteria akceptacji:

- Błąd generacji nie traci wprowadzonych parametrów.
- Dostępny jest przycisk ponów; po sukcesie treść jest widoczna w podglądzie.
- Błąd jest raportowany w telemetrii.

US-022
Tytuł: Błąd sieci podczas zapisu/publikacji
Opis: Jako użytkownik chcę jasnej informacji i bezpiecznego stanu przy problemach sieciowych.
Kryteria akceptacji:

- Pojawia się komunikat o błędzie i opcja ponów.
- Stan (draft/published) nie ulega niespójnym zmianom.
- Nie powstają duplikaty rekordów.

US-023
Tytuł: Limit pozycji w Shop
Opis: Jako użytkownik nie mogę dodać więcej niż ~255 pozycji do listy buy/sell.
Kryteria akceptacji:

- Dodanie pozycji ponad limit jest zablokowane z komunikatem.
- Licznik pozycji jest widoczny użytkownikowi.
- Istniejące pozycje można nadal edytować/usuwać.

US-024
Tytuł: Autoryzacja akcji właściciela
Opis: Jako system chcę uniemożliwić edycję/publikację/usuwanie NPC przez osoby niebędące właścicielem.
Kryteria akceptacji:

- Próba akcji przez innego użytkownika zwraca błąd i nie zmienia danych.
- Widok publiczny nie zawiera akcji właściciela.
- Dostęp do API jest weryfikowany po userId właściciela.

## 6. Metryki sukcesu

- TTFNPC: mediana czasu od wejścia do kreatora do pierwszego działającego NPC ≤ 5 minut.
- Konwersja Create→Publish: odsetek utworzonych, które zostały opublikowane (cel rosnący w czasie).
- Adopcja Keywords: odsetek opublikowanych NPC zawierających co najmniej jeden wpis keywords.
- Stabilność generacji: odsetek sukcesów generacji XML; liczba błędów per 100 prób.
- Skuteczność auth: odsetek skutecznych logowań vs wygasłe/nieprawidłowe linki.
- Wydajność: czas generacji XML; wydajność /npcs (SSR pierwszych 100); płynność infinite scroll.
