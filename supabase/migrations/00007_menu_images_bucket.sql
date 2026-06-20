-- ============================================
-- TableFlow — Storage Bucket Migration
-- Creates the menu-images bucket for menu items
-- ============================================

-- Create a new public bucket for menu images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Set up Row Level Security (RLS) policies for the bucket
-- 1. Anyone can view/download images (public)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'menu-images' );

-- 2. Authenticated users can upload images
CREATE POLICY "Authenticated Uploads"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'menu-images' AND auth.role() = 'authenticated' );

-- 3. Authenticated users can update/delete their own uploads (or anything, since we don't strict RLS on objects to user ID for now in this MVP)
CREATE POLICY "Authenticated Updates"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'menu-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Deletes"
ON storage.objects FOR DELETE
USING ( bucket_id = 'menu-images' AND auth.role() = 'authenticated' );
