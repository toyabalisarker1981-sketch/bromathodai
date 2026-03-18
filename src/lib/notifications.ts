import { supabase } from "@/integrations/supabase/client";

interface NotifyOptions {
  userId: string;
  type: "message" | "challenge" | "group" | "general";
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const sendNotification = async ({ userId, type, title, body, data = {} }: NotifyOptions) => {
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    data,
  });
};

// Fun Bengali notification messages
export const notifyNewMessage = (senderId: string, senderName: string, receiverId: string) =>
  sendNotification({
    userId: receiverId,
    type: "message",
    title: "💬 নতুন মেসেজ এসেছে!",
    body: `${senderName} তোমাকে মেসেজ পাঠিয়েছে! দেখে নাও কী বলছে 😄`,
    data: { senderId },
  });

export const notifyChallengeSent = (challengerName: string, challengedId: string, subject: string) =>
  sendNotification({
    userId: challengedId,
    type: "challenge",
    title: "⚔️ চ্যালেঞ্জ এসেছে!",
    body: `${challengerName} তোমাকে ${subject} বিষয়ে চ্যালেঞ্জ করেছে! ভয় পেও না, জিতে যাও! 💪🔥`,
    data: { subject },
  });

export const notifyChallengeCompleted = (playerName: string, otherPlayerId: string, subject: string, score: number, total: number) =>
  sendNotification({
    userId: otherPlayerId,
    type: "challenge",
    title: "🎯 চ্যালেঞ্জের ফলাফল!",
    body: `${playerName} ${subject} চ্যালেঞ্জে ${score}/${total} পেয়েছে! তোমার স্কোর কত হবে? 🤔`,
    data: { subject, score, total },
  });

export const notifyGroupChallenge = (challengerName: string, memberId: string, groupName: string, subject: string) =>
  sendNotification({
    userId: memberId,
    type: "challenge",
    title: "🏆 গ্রুপ চ্যালেঞ্জ!",
    body: `${challengerName} "${groupName}" গ্রুপে ${subject} চ্যালেঞ্জ দিয়েছে! সবার আগে তুমি দাও! 🚀`,
    data: { groupName, subject },
  });

export const notifyGroupMessage = (senderName: string, memberId: string, groupName: string) =>
  sendNotification({
    userId: memberId,
    type: "group",
    title: `👥 ${groupName}`,
    body: `${senderName} গ্রুপে মেসেজ পাঠিয়েছে! চেক করো কী হচ্ছে 👀`,
    data: { groupName },
  });

export const notifyFriendAdded = (adderName: string, friendId: string) =>
  sendNotification({
    userId: friendId,
    type: "general",
    title: "🎉 নতুন বন্ধু!",
    body: `${adderName} তোমাকে বন্ধু হিসেবে যোগ করেছে! একসাথে পড়াশোনা করো 📚✨`,
  });

export const notifyGroupInvite = (inviterName: string, invitedId: string, groupName: string) =>
  sendNotification({
    userId: invitedId,
    type: "group",
    title: "👥 গ্রুপে যোগ হয়েছো!",
    body: `${inviterName} তোমাকে "${groupName}" গ্রুপে যুক্ত করেছে! যোগ দিয়ে চ্যাট শুরু করো 🎊`,
    data: { groupName },
  });
