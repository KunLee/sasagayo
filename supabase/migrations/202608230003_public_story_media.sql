grant select on table public.media_assets to anon;

create policy "Public ready media is visible"
on public.media_assets
for select
to anon
using (visibility = 'public' and status = 'ready');
