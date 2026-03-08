-- Create storage bucket for notebook uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('notebook-uploads', 'notebook-uploads', true);

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'notebook-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read own files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'notebook-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'notebook-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Create notes table
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Note',
  content text,
  source_type text NOT NULL DEFAULT 'manual',
  source_url text,
  file_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes" ON public.notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();