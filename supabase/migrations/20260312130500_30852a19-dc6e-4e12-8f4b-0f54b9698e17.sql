
-- Create storage policies for library bucket to allow admin uploads
CREATE POLICY "Authenticated users can upload to library"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'library');

CREATE POLICY "Anyone can read library files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'library');

CREATE POLICY "Authenticated users can upload to notebook-uploads"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'notebook-uploads');

CREATE POLICY "Anyone can read notebook-uploads files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'notebook-uploads');
