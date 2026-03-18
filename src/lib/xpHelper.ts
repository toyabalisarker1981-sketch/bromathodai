import { supabase } from "@/integrations/supabase/client";

/**
 * Update XP, level, and streak for a user (streak increments only once per day)
 */
export async function updateXpAndStreak(userId: string, xpEarned: number) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, level, streak_days, last_active_date")
    .eq("user_id", userId)
    .single();

  if (!profile) return null;

  const newXp = (profile.xp || 0) + xpEarned;
  const newLevel = Math.floor(newXp / 500) + 1;

  const today = new Date().toISOString().split("T")[0];
  const lastActive = profile.last_active_date as string | null;

  let newStreak = profile.streak_days || 0;
  if (lastActive !== today) {
    // Check if it was yesterday (continue streak) or older (reset to 1)
    if (lastActive) {
      const lastDate = new Date(lastActive);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000);
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }
  }

  const { error } = await supabase.from("profiles").update({
    xp: newXp,
    level: newLevel,
    streak_days: newStreak,
    last_active_date: today,
  }).eq("user_id", userId);

  if (error) return null;
  return { xp: newXp, level: newLevel, streak_days: newStreak, xpEarned };
}

/**
 * Save exam result to exam_results table
 */
export async function saveExamResult(userId: string, totalQuestions: number, score: number, accuracy: number, answers?: any, examId?: string) {
  const { error } = await supabase.from("exam_results").insert({
    user_id: userId,
    total_questions: totalQuestions,
    score,
    accuracy,
    answers: answers || null,
    exam_id: examId || null,
  });
  return !error;
}
