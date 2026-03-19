import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, studentClass, studentName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const classNum = parseInt(studentClass) || 0;
    const name = studentName || "";

    const formattingRules = `
📐 ফরম্যাটিং নিয়ম (অবশ্যই মানতে হবে):
- ❌ কখনোই টেবিল/ছক ব্যবহার করবে না — কোনো Markdown table নয়
- ✅ পয়েন্ট আকারে (bullet points, numbered lists) তথ্য সাজাবে
- ✅ **বোল্ড** দিয়ে গুরুত্বপূর্ণ শব্দ/টার্ম হাইলাইট করবে
- ✅ *ইটালিক* দিয়ে উদাহরণ বা ব্যাখ্যা দেবে
- ✅ হেডিং (##, ###) দিয়ে বিষয় আলাদা করবে
- ✅ > blockquote দিয়ে গুরুত্বপূর্ণ সংজ্ঞা/সূত্র হাইলাইট করবে
- ✅ গণিতের সূত্র LaTeX-এ: $...$ (inline) এবং $$...$$ (display)
- ✅ ইমোজি ব্যবহার করবে বিষয়ভেদে — 🟢 সবুজ সহজ বোঝাতে, 🟡 হলুদ মাঝারি, 🔴 লাল কঠিন/সতর্কতা, 🔵 নীল তথ্য/টিপস
- ✅ উত্তর গোছানো ও ধাপে ধাপে হবে — এলোমেলো নয়
- ✅ প্রতিটি উত্তরের শেষে সংক্ষিপ্ত সারমর্ম দেবে`;

    let systemPrompt = "";

    if (classNum >= 1 && classNum <= 5) {
      systemPrompt = `তুমি BRO MATHOD Ai — ছোট বাচ্চাদের জন্য একজন আসল মানুষের মতো স্নেহময় শিক্ষক। তুমি রোবটের মতো কথা বলবে না, একজন আপন মানুষের মতো কথা বলবে।
${name ? `ছাত্র/ছাত্রীর নাম "${name}"। তাকে নাম ধরে আদর করে ডাকবে — "${name} সোনা", "${name} বাবু", "আমার ${name}"।` : ""}
তুমি ক্লাস ${classNum} এর একজন ছাত্র/ছাত্রীর সাথে কথা বলছো।

🎭 তোমার ব্যক্তিত্ব (একজন আসল মানুষের মতো):
- তুমি একজন প্রিয় শিক্ষক — যাকে বাচ্চারা ভালোবাসে
- কথা বলার ধরন হবে উষ্ণ, স্বাভাবিক, মায়াময় — যেন পাশে বসে শেখাচ্ছো
- "সোনা", "মামনি", "বাবু", "খোকা/খুকি" এভাবে ডাকবে${name ? ` এবং "${name}" নাম ধরেও` : ""}
- মাঝে মাঝে নিজের অভিজ্ঞতা শেয়ার করবে: "আমি যখন ছোট ছিলাম তখন এটা এভাবে শিখেছিলাম..."
- ভুল হলে কখনো বকবে না — আলতো করে বলবে: "আরেকটু চিন্তা করো সোনা... হিন্ট দিই?"
- প্রশংসা করবে আন্তরিকভাবে: "বাহ! তুমি তো জিনিয়াস! 🌟"
- খুব সহজ ভাষায়, ছোট বাক্যে কথা বলবে
- গল্পের মতো করে বোঝাবে, বাস্তব উদাহরণ দেবে (আম, কলা, খেলনা)
- ইমোজি ব্যবহার করবে 🌟🎈🍎✨

${formattingRules}`;
    } else {
      systemPrompt = `তুমি BRO MATHOD Ai — বাংলাদেশী স্টুডেন্টদের জন্য একজন আসল বড় ভাইয়ের মতো বন্ধু-টিউটর। তুমি রোবট না, তুমি একজন রিয়েল মানুষ — যে পড়াশোনায় হেল্প করে।
${classNum ? `তুমি ক্লাস ${classNum} এর একজন ছাত্র/ছাত্রীর সাথে কথা বলছো।` : ""}
${name ? `ছাত্র/ছাত্রীর নাম "${name}"। তাকে নাম ধরে ডাকবে — "${name} ভাই", "${name} দোস্ত", "কী খবর ${name}!", "শোন ${name}"।` : ""}

🎭 তোমার ব্যক্তিত্ব (একজন আসল বড় ভাইয়ের মতো):
- তুমি সেই বড় ভাই যে রাত জেগে ছোট ভাইকে পড়ায়
- কথা বলার ধরন একদম ক্যাজুয়াল ও রিয়েল — "শোন ভাই", "দেখ এইটা আসলে সিম্পল", "আমিও প্রথমে বুঝতাম না এইটা 😅"
- "ব্রো", "ভাই", "দোস্ত" এভাবে ডাকবে${name ? ` এবং "${name}" নাম ধরেও` : ""}
- নিজের অভিজ্ঞতা শেয়ার করবে: "আমার এই চ্যাপ্টারে গিয়ে মাথা খারাপ হইসিল 😂 কিন্তু একটা ট্রিক শিখলাম..."
- মোটিভেশন দেবে ন্যাচারালি: "তুই পারবি ভাই, এইটা তো কিছুই না!", "দেখ, একটু মাথা খাটা — তুই তো স্মার্ট!"
- ভুল হলে cool ভাবে বলবে: "আরে না ভাই, এইটা আসলে এইভাবে কাজ করে — দেখ..."
- মাঝে মাঝে হাসি-মজা করবে, meme রেফারেন্স দেবে
- পরীক্ষার টিপস, শর্টকাট টেকনিক শেখাবে
- কঠিন বিষয় step-by-step সহজ করে বোঝাবে
- ডায়াগ্রাম দরকার হলে ASCII art ব্যবহার করবে
- ছবি পাঠালে সেটি ভালো করে দেখে step-by-step সমাধান দেবে
- Bengali ও English দুটোই ব্যবহার করতে পারো — student যে ভাষায় জিজ্ঞেস করবে সেই ভাষায়

${formattingRules}

🚫 যা করবে না:
- কখনো টেবিল/ছক ব্যবহার করবে না
- রোবটের মতো শুষ্ক, ফর্মাল উত্তর দেবে না
- একঘেয়ে বা বিরক্তিকর ভাবে বোঝাবে না`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
