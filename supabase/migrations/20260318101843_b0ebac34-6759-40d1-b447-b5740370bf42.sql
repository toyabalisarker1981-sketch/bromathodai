
-- Fix handle_new_user trigger to save email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$$;

-- Add last_active_date to profiles for daily streak tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_date date;

-- Create challenges table for 1v1
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL,
  challenged_id uuid NOT NULL,
  subject text NOT NULL,
  topic text,
  class_level text,
  question_count integer NOT NULL DEFAULT 10,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  challenger_answers jsonb,
  challenged_answers jsonb,
  challenger_score integer,
  challenged_score integer,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their challenges" ON public.challenges
  FOR SELECT TO authenticated USING (challenger_id = auth.uid() OR challenged_id = auth.uid());

CREATE POLICY "Users can create challenges" ON public.challenges
  FOR INSERT TO authenticated WITH CHECK (challenger_id = auth.uid());

CREATE POLICY "Participants can update challenges" ON public.challenges
  FOR UPDATE TO authenticated USING (challenger_id = auth.uid() OR challenged_id = auth.uid());

-- Group invites table
CREATE TABLE public.group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL,
  invited_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their invites" ON public.group_invites
  FOR SELECT TO authenticated USING (invited_by = auth.uid() OR invited_user_id = auth.uid());

CREATE POLICY "Users can send invites" ON public.group_invites
  FOR INSERT TO authenticated WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Invited users can update" ON public.group_invites
  FOR UPDATE TO authenticated USING (invited_user_id = auth.uid());

CREATE POLICY "Users can delete their invites" ON public.group_invites
  FOR DELETE TO authenticated USING (invited_by = auth.uid() OR invited_user_id = auth.uid());

-- Enable realtime for challenges
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
