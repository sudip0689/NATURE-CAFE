-- Restore uploads, which have been failing since the switch to username login.
--
-- 0002 and 0003 gated writes to both buckets on private.is_owner(), which read
-- auth.uid(). 0008 removed Supabase Auth and dropped that function; the drop
-- cascaded and took the two write policies with it. Nothing replaced them, so
-- storage.objects kept RLS enabled with read-only policies and every upload --
-- product photos and the UPI QR alike -- was denied. Both surfaces showed
-- "Could not upload… Try again." because both were hitting the same wall.
--
-- Authorization now lives where every other write in this app decides it:
-- requireOwner() in the server action, before the upload is attempted. The
-- database can no longer tell who is calling -- that is what 0008 traded away
-- -- so these policies match the shape already used by products, categories
-- and settings rather than pretending to a check that cannot be made.
--
-- The one guarantee that still holds in the database is unchanged: bills and
-- bill_items have no write policy, so a sale can only be created by
-- create_bill.

begin;

-- product-images ------------------------------------------------------------
drop policy if exists product_images_owner_writes on storage.objects;
drop policy if exists product_images_writes on storage.objects;

create policy product_images_writes on storage.objects
  for all
  to anon, authenticated
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

-- cafe-assets (the UPI QR) ---------------------------------------------------
drop policy if exists cafe_assets_owner_writes on storage.objects;
drop policy if exists cafe_assets_writes on storage.objects;

create policy cafe_assets_writes on storage.objects
  for all
  to anon, authenticated
  using (bucket_id = 'cafe-assets')
  with check (bucket_id = 'cafe-assets');

-- Limits the app already claims, enforced by storage too ---------------------
-- The server action checks size and type before uploading; stating the same
-- limits here means a request that somehow skips that path still cannot fill
-- the bucket with a 4GB file. 2 MB, and still images only.
update storage.buckets
   set file_size_limit    = 2097152,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id in ('product-images', 'cafe-assets');

commit;
