-- Remove the first-generation importer. Its 106 R2 files were deleted on
-- 2026-10-21 and nothing reads these tables or calls these functions; the
-- library lives in public.tracks.

drop function if exists public.admin_music_candidates(text, text, timestamptz, uuid, integer);
drop function if exists public.admin_music_candidates(text, text, integer);
drop function if exists public.admin_music_candidates();
drop function if exists public.admin_add_music_candidate(text, text, text, text, text, text, text);
drop function if exists public.admin_review_music_candidate(uuid, text, text);
drop function if exists public.admin_retry_music_candidate(uuid, text);
drop function if exists public.admin_set_catalog_publication(uuid, text, text);
drop function if exists public.register_music_candidates(jsonb);

-- catalog_tracks and music_source_candidates reference each other, so all
-- three go in one statement.
drop table if exists public.catalog_references, public.catalog_tracks, public.music_source_candidates;
