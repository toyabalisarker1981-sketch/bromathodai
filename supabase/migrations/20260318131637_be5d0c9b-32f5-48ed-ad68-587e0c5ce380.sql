
-- Fix the overly permissive group_members INSERT policy
DROP POLICY IF EXISTS "Anyone authenticated can add group members" ON public.group_members;

-- Allow group creators to add members OR users to add themselves
CREATE POLICY "Group creators or self can add members"
ON public.group_members FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.groups g 
    WHERE g.id = group_members.group_id 
    AND g.created_by = auth.uid()
  )
);
