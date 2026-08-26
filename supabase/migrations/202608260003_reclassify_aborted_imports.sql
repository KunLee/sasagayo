update public.music_source_candidates
set failure_class='transient',next_attempt_at=now()+interval '2 hours'
where status='failed' and last_error ilike '%abort%' and failure_class='permanent' and attempt_count<5;
