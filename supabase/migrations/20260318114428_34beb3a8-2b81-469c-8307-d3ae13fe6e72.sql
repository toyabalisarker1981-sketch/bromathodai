
-- Create notices table for admin dynamic banner
CREATE TABLE public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  title text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Everyone can view active notices
CREATE POLICY "Anyone can view notices" ON public.notices
  FOR SELECT TO authenticated USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert notices" ON public.notices
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update
CREATE POLICY "Admins can update notices" ON public.notices
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete notices" ON public.notices
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for notice images
INSERT INTO storage.buckets (id, name, public) VALUES ('notices', 'notices', true);

-- Storage policies for notices bucket
CREATE POLICY "Anyone can view notice images" ON storage.objects
  FOR SELECT USING (bucket_id = 'notices');

CREATE POLICY "Admins can upload notice images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'notices' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete notice images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'notices' AND has_role(auth.uid(), 'admin'::app_role));
