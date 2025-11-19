-- Create bucket for reference images
INSERT INTO storage.buckets (id, name, public)
VALUES ('reference-images', 'reference-images', true);

-- RLS Policies for storage
CREATE POLICY "Users can upload own reference images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reference-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view reference images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reference-images');

CREATE POLICY "Users can delete own reference images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'reference-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
