-- Storage deletes look the object up first, so owners also need to "see" their
-- own folder. Public reads go through the public URL and are unaffected.
create policy "Owners see their picture" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
