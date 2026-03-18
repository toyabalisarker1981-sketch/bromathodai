import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchUrlContent(url: string): Promise<string> {
  try {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) {
      return `এটি একটি YouTube ভিডিও (ID: ${ytMatch[1]})। এই ভিডিওর বিষয়বস্তু থেকে প্রশ্ন তৈরি করো। URL: ${url}`;
    }

    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BroMathodBot/1.0)" },
    });
    if (resp.ok) {
      const text = await resp.text();
      const cleanText = text
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000);
      return cleanText || `URL: ${url} — এই ওয়েবসাইটের কন্টেন্ট থেকে প্রশ্ন তৈরি করো।`;
    }
  } catch (e) {
    console.error("URL fetch error:", e);
  }
  return `URL: ${url} — এই লিংকের বিষয়বস্তু থেকে প্রশ্ন তৈরি করো।`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subject, classLevel, topic, customContent, questionCount } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const count = questionCount || 5;

    let prompt = "";
    if (customContent) {
      const urlMatch = customContent.match(/https?:\/\/[^\s]+/);
      let enrichedContent = customContent;
      if (urlMatch) {
        const fetchedContent = await fetchUrlContent(urlMatch[0]);
        enrichedContent = `${customContent}\n\nওয়েবসাইট/ভিডিও থেকে পাওয়া কন্টেন্ট:\n${fetchedContent}`;
      }

      prompt = `নিচের কন্টেন্ট খুব ভালোভাবে পড়ো এবং বিশ্লেষণ করো। শুধুমাত্র এই কন্টেন্টে যা আছে তার উপর ভিত্তি করে ${count}টি MCQ প্রশ্ন তৈরি করো।

⚠️ অত্যন্ত গুরুত্বপূর্ণ নির্দেশনা:
- শুধুমাত্র কন্টেন্টের মূল পড়ার অংশ (main academic content) থেকে প্রশ্ন তৈরি করো
- নিচের বিষয়গুলো সম্পূর্ণ উপেক্ষা করো এবং এগুলো নিয়ে কোনো প্রশ্ন করবে না:
  * PDF-এর সাইজ, ফরম্যাট, ফাইলের নাম
  * কভার পেজ, কভারের রঙ, ডিজাইন
  * সূচিপত্র (Index), পৃষ্ঠা নম্বর
  * লেখক, প্রকাশক, প্রকাশনা সংস্থার তথ্য
  * কপিরাইট, ISBN নম্বর
  * ছবির ক্যাপশন বা রেফারেন্স নম্বর
- প্রশ্নগুলো বোর্ড পরীক্ষার মানের হতে হবে
- প্রতিটি প্রশ্ন একাডেমিক জ্ঞান যাচাই করবে

কন্টেন্ট: ${enrichedContent}`;
    } else {
      prompt = `বাংলাদেশ NCTB সিলেবাস অনুযায়ী ক্লাস ${classLevel} এর "${subject}" বিষয়ের ${topic ? `"${topic}" টপিক/অধ্যায় থেকে` : "বিভিন্ন গুরুত্বপূর্ণ টপিক থেকে"} ${count}টি MCQ প্রশ্ন তৈরি করো।

⚠️ অত্যন্ত গুরুত্বপূর্ণ নির্দেশনা:
- NCTB (জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড) এর অফিসিয়াল পাঠ্যপুস্তক (https://nctb.gov.bd) অনুসরণ করো
- প্রশ্নগুলো বাংলাদেশ বোর্ড পরীক্ষা (JSC, SSC, HSC) এর মানের হতে হবে
- NCTB পাঠ্যপুস্তকের মূল পড়ার অংশ থেকে প্রশ্ন তৈরি করো
- বাস্তব পরীক্ষায় যেমন প্রশ্ন আসে সেই ধরনের প্রশ্ন তৈরি করো
- তথ্যভিত্তিক, প্রয়োগমূলক এবং বিশ্লেষণমূলক প্রশ্নের সমন্বয় রাখো
- কভার পেজ, সূচিপত্র, পৃষ্ঠা নম্বর, লেখকের তথ্য, PDF ফরম্যাট, বইয়ের রঙ, সাইজ ইত্যাদি নিয়ে কোনো প্রশ্ন করবে না
- শুধুমাত্র অধ্যায়ের মূল বিষয়বস্তু (তত্ত্ব, সূত্র, ধারণা, তথ্য, ঘটনা, সংজ্ঞা) থেকে প্রশ্ন করো`;
    }

    prompt += `\n\nপ্রতিটি প্রশ্নের জন্য:
- প্রশ্ন (বাংলায়)
- ৪টি অপশন (প্রতিটি অপশন যুক্তিসঙ্গত হতে হবে, একটি সঠিক এবং বাকি তিনটি বিভ্রান্তিকর কিন্তু ভুল)
- সঠিক উত্তরের ইনডেক্স (0-3)
- সংক্ষিপ্ত ব্যাখ্যা (কেন এটি সঠিক — NCTB পাঠ্যবই অনুসারে)

IMPORTANT: তোমাকে অবশ্যই suggest_quiz tool ব্যবহার করে উত্তর দিতে হবে।`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `তুমি বাংলাদেশ NCTB সিলেবাসের একজন অত্যন্ত দক্ষ ও অভিজ্ঞ শিক্ষক। তোমার কাজ হলো শিক্ষার্থীদের জন্য বোর্ড পরীক্ষার মানের (JSC, SSC, HSC) MCQ প্রশ্ন তৈরি করা।

তোমার নিয়ম:
1. শুধুমাত্র একাডেমিক কন্টেন্ট থেকে প্রশ্ন তৈরি করবে
2. PDF-এর ফরম্যাট, সাইজ, কভার পেজের রঙ, ছবি, সূচিপত্র, পৃষ্ঠা নম্বর, লেখকের নাম, প্রকাশনা সংস্থা — এগুলো নিয়ে কখনোই কোনো প্রশ্ন করবে না
3. প্রশ্ন হবে পাঠ্যবইয়ের মূল বিষয়বস্তু (তত্ত্ব, সূত্র, ধারণা, তথ্য, ঘটনা) থেকে
4. প্রশ্নের মান বোর্ড পরীক্ষার সমতুল্য হতে হবে
5. যদি কোনো কন্টেন্ট/URL দেওয়া হয়, তাহলে শুধুমাত্র সেই কন্টেন্টের একাডেমিক অংশ থেকেই প্রশ্ন তৈরি করবে`,
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_quiz",
              description: "Return quiz questions in structured format",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        options: { type: "array", items: { type: "string" } },
                        correctIndex: { type: "number" },
                        explanation: { type: "string" },
                      },
                      required: ["question", "options", "correctIndex", "explanation"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_quiz" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI service error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No structured response from AI");
  } catch (e) {
    console.error("generate-quiz error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
