-- Create admin role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS: users can view their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Admins can manage roles
CREATE POLICY "Admins can manage roles" ON public.user_roles
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create library storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('library', 'library', true);

-- Library storage policies - only admins can upload
CREATE POLICY "Admins can upload library files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'library' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view library files" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'library');

CREATE POLICY "Admins can delete library files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'library' AND public.has_role(auth.uid(), 'admin'));

-- Create library_items table
CREATE TABLE public.library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  subject text,
  class_level integer,
  pdf_url text NOT NULL,
  thumbnail_url text,
  uploaded_by uuid NOT NULL,
  view_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;

-- Everyone can view library items
CREATE POLICY "Anyone can view library items" ON public.library_items
FOR SELECT TO authenticated USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can insert library items" ON public.library_items
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update library items" ON public.library_items
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete library items" ON public.library_items
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_library_items_updated_at
BEFORE UPDATE ON public.library_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();