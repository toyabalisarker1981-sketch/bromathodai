
-- Fix group_members INSERT policy to allow group creators to add members
DROP POLICY IF EXISTS "Group creators or self can add members" ON public.group_members;
CREATE POLICY "Anyone authenticated can add group members"
ON public.group_members FOR INSERT TO authenticated
WITH CHECK (true);

-- Create group_messages table for group chat
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Group members can view messages
CREATE POLICY "Group members can view messages"
ON public.group_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = group_messages.group_id 
    AND gm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.groups g 
    WHERE g.id = group_messages.group_id 
    AND g.created_by = auth.uid()
  )
);

-- Group members can send messages
CREATE POLICY "Group members can send messages"
ON public.group_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND (
    EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.group_id = group_messages.group_id 
      AND gm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.groups g 
      WHERE g.id = group_messages.group_id 
      AND g.created_by = auth.uid()
    )
  )
);

-- Enable realtime for group_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
