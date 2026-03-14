
-- Friend requests table
CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_user_id, to_user_id)
);

-- Friends table (accepted friendships)
CREATE TABLE public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id)
);

-- Groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Group members table
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- Community exams table
CREATE TABLE public.community_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  exam_type TEXT NOT NULL DEFAULT 'group',
  question_count INTEGER NOT NULL DEFAULT 25,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  questions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Community exam results
CREATE TABLE public.exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.community_exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  accuracy NUMERIC(5,2) NOT NULL DEFAULT 0,
  answers JSONB,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Study tube videos table
CREATE TABLE public.study_tube_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  thumbnail_url TEXT,
  subject TEXT,
  topic TEXT,
  class_level INTEGER,
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reading progress table
CREATE TABLE public.reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  library_item_id UUID NOT NULL REFERENCES public.library_items(id) ON DELETE CASCADE,
  last_page INTEGER DEFAULT 0,
  total_pages INTEGER DEFAULT 0,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, library_item_id)
);

-- Enable RLS on all tables
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_tube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

-- RLS for friend_requests
CREATE POLICY "Users can view their own friend requests" ON public.friend_requests FOR SELECT TO authenticated USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
CREATE POLICY "Users can send friend requests" ON public.friend_requests FOR INSERT TO authenticated WITH CHECK (from_user_id = auth.uid());
CREATE POLICY "Users can update friend requests sent to them" ON public.friend_requests FOR UPDATE TO authenticated USING (to_user_id = auth.uid());
CREATE POLICY "Users can delete their own friend requests" ON public.friend_requests FOR DELETE TO authenticated USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- RLS for friends
CREATE POLICY "Users can view their friendships" ON public.friends FOR SELECT TO authenticated USING (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY "Users can add friends" ON public.friends FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can remove friends" ON public.friends FOR DELETE TO authenticated USING (user_id = auth.uid() OR friend_id = auth.uid());

-- RLS for groups
CREATE POLICY "Anyone can view groups" ON public.groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create groups" ON public.groups FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Group creators can update" ON public.groups FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Group creators can delete" ON public.groups FOR DELETE TO authenticated USING (created_by = auth.uid());

-- RLS for group_members
CREATE POLICY "Anyone can view group members" ON public.group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Group creators or self can add members" ON public.group_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members can leave" ON public.group_members FOR DELETE TO authenticated USING (user_id = auth.uid());

-- RLS for community_exams
CREATE POLICY "Anyone can view active exams" ON public.community_exams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create exams" ON public.community_exams FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creators can update exams" ON public.community_exams FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Creators can delete exams" ON public.community_exams FOR DELETE TO authenticated USING (created_by = auth.uid());

-- RLS for exam_results
CREATE POLICY "Users can view exam results" ON public.exam_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own results" ON public.exam_results FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- RLS for study_tube_videos
CREATE POLICY "Anyone can view videos" ON public.study_tube_videos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can add videos" ON public.study_tube_videos FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete videos" ON public.study_tube_videos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- RLS for reading_progress
CREATE POLICY "Users can view own progress" ON public.reading_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own progress" ON public.reading_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own progress" ON public.reading_progress FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Enable realtime for community features
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_exams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_results;
