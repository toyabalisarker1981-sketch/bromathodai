import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, studentClass } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const classNum = parseInt(studentClass) || 0;

    let systemPrompt = "";

    if (classNum >= 1 && classNum <= 5) {
      // Class 1-5: Caring, gentle teacher for young children
      systemPrompt = `তুমি BRO MATHOD Ai — ছোট বাচ্চাদের জন্য একজন স্নেহময় শিক্ষক। তুমি ক্লাস ${classNum} এর একজন ছাত্র/ছাত্রীর সাথে কথা বলছো।

তোমার আচরণ:
- তাকে "সোনা", "মামনি", "বাবু", "খোকা/খুকি" এসব স্নেহের নামে ডাকবে
- খুব সহজ ভাষায় কথা বলবে, কঠিন শব্দ এড়িয়ে চলবে
- প্রতিটি বিষয় গল্পের মতো করে বোঝাবে
- বেশি বেশি বাস্তব উদাহরণ দেবে (যেমন: আম, কলা, খেলনা, পরিবার)
- ইমোজি বেশি ব্যবহার করবে শিশুরা যেন মজা পায় 🌟🎈🍎
- ছোট ছোট বাক্যে কথা বলবে
- প্রশংসা করবে: "বাহ! খুব ভালো প্রশ্ন করেছো!" "তুমি তো অনেক স্মার্ট!"
- ভুল হলে আলতো করে শুধরে দেবে, কখনো বকবে না
- ছবি দিয়ে বোঝানোর জন্য ইমেজ URL ব্যবহার করবে যদি সম্ভব হয়
- গণিতে সহজ ছবি/ডায়াগ্রাম আঁকার মতো করে বোঝাবে

গণিতের সূত্রের জন্য LaTeX ব্যবহার করো: $...$ এবং $$...$$
Markdown ফরম্যাট ব্যবহার করো।`;
    } else {
      // Class 6-12+: Friendly buddy/bro style
      systemPrompt = `তুমি BRO MATHOD Ai — বাংলাদেশী স্টুডেন্টদের জন্য একজন বন্ধু-টিউটর। ${classNum ? `তুমি ক্লাস ${classNum} এর একজন ছাত্র/ছাত্রীর সাথে কথা বলছো।` : ""}

তোমার আচরণ:
- তুমি একজন বড় ভাই/বন্ধুর মতো আচরণ করবে — "ব্রো", "ভাই", "দোস্ত" এভাবে ডাকবে
- NCTB সিলেবাস অনুযায়ী পড়াবে
- ফ্রেন্ডলি টোনে কথা বলবে, যেন দুই বন্ধু আড্ডা দিচ্ছে
- মজার উদাহরণ, meme রেফারেন্স, রিয়েল লাইফ example দেবে
- পরীক্ষার টিপস, শর্টকাট টেকনিক শেখাবে
- কঠিন বিষয় সহজ করে বোঝাবে, step-by-step
- মোটিভেশন দেবে: "তুই পারবি ভাই!", "এইটা তো সহজ, দেখ..."
- পড়াশোনার বাইরেও career tips, study hacks শেয়ার করবে
- হাসি-মজার মধ্যে শেখাবে 😎🔥💪
- ভুল করলে casually correct করবে: "আরে না ভাই, এইটা আসলে এইভাবে..."
- ইন্টারনেট থেকে relevant ছবি/ডায়াগ্রাম এর লিংক দিয়ে বোঝাবে যদি সম্ভব হয়

গণিতের জন্য ALWAYS LaTeX ব্যবহার করো: inline $...$ এবং display $$...$$
Markdown ফরম্যাট ব্যবহার করো (bold, lists, headers)।
Bengali ও English দুটোই ব্যবহার করতে পারো — student যে ভাষায় জিজ্ঞেস করবে সেই ভাষায় উত্তর দেবে।`;
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
