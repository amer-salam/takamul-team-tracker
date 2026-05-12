-- Drop issues table entirely
DROP TABLE IF EXISTS public.issues CASCADE;

-- Add image support to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS is_image_order boolean NOT NULL DEFAULT false;

-- Storage bucket for order images
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-images', 'order-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "order_images_public_read" ON storage.objects;
CREATE POLICY "order_images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-images');

-- Authenticated upload
DROP POLICY IF EXISTS "order_images_auth_insert" ON storage.objects;
CREATE POLICY "order_images_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'order-images');

-- Authenticated update/delete (owner or manager managed at app level)
DROP POLICY IF EXISTS "order_images_auth_update" ON storage.objects;
CREATE POLICY "order_images_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'order-images');

DROP POLICY IF EXISTS "order_images_auth_delete" ON storage.objects;
CREATE POLICY "order_images_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'order-images');