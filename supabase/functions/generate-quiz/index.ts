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
    const cls = classLevel || "10";

    // NCTB curriculum mapping for accurate class-wise content
    const nctbCurriculumContext = `
তুমি বাংলাদেশের জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড (NCTB, nctb.gov.bd) এর অফিসিয়াল পাঠ্যপুস্তক অনুসরণ করো।

ক্লাস: ${cls}
বিষয়: ${subject || "সাধারণ"}
${topic ? `অধ্যায়/টপিক: ${topic}` : ""}

⚠️ অত্যন্ত গুরুত্বপূর্ণ নিয়ম:
1. শুধুমাত্র ক্লাস ${cls} এর NCTB পাঠ্যবইয়ের কন্টেন্ট ব্যবহার করো
2. অন্য ক্লাসের (উপরের বা নিচের) কন্টেন্ট থেকে কখনোই প্রশ্ন করবে না
3. ক্লাস ${cls} এর সিলেবাস ও পাঠ্যপুস্তকের বাইরে কোনো প্রশ্ন করবে না
4. বাংলাদেশ বোর্ড পরীক্ষার (${parseInt(cls) <= 8 ? "JSC/PSC" : parseInt(cls) <= 10 ? "SSC" : "HSC"}) মানের প্রশ্ন তৈরি করো
5. প্রশ্ন হবে তথ্যভিত্তিক, প্রয়োগমূলক ও বিশ্লেষণমূলক মিশ্রণে
6. প্রতিটি প্রশ্নের ৪টি অপশন যুক্তিসঙ্গত হবে — একটি সঠিক, বাকি ৩টি বিভ্রান্তিকর কিন্তু ভুল
7. ব্যাখ্যায় NCTB পাঠ্যবইয়ের কোন অধ্যায় থেকে এই তথ্য পাওয়া যায় তা উল্লেখ করো
`;

    let prompt = "";
    if (customContent) {
      const urlMatch = customContent.match(/https?:\/\/[^\s]+/);
      let enrichedContent = customContent;
      if (urlMatch) {
        const fetchedContent = await fetchUrlContent(urlMatch[0]);
        enrichedContent = `${customContent}\n\nওয়েবসাইট/ভিডিও থেকে পাওয়া কন্টেন্ট:\n${fetchedContent}`;
      }

      prompt = `${nctbCurriculumContext}

নিচের কন্টেন্ট খুব ভালোভাবে পড়ো এবং বিশ্লেষণ করো। শুধুমাত্র এই কন্টেন্টের মূল একাডেমিক অংশ থেকে ${count}টি MCQ প্রশ্ন তৈরি করো।

⚠️ সম্পূর্ণ উপেক্ষা করো:
- PDF-এর সাইজ, ফরম্যাট, ফাইলের নাম, কভার পেজ, কভারের রঙ/ডিজাইন
- সূচিপত্র (Index), পৃষ্ঠা নম্বর, লেখক/প্রকাশক তথ্য, ISBN, কপিরাইট
- ছবির ক্যাপশন, রেফারেন্স নম্বর, হেডার/ফুটার

কন্টেন্ট: ${enrichedContent}`;
    } else {
      prompt = `${nctbCurriculumContext}

ক্লাস ${cls} এর "${subject}" বিষয়ের ${topic ? `"${topic}" অধ্যায় থেকে` : "বিভিন্ন গুরুত্বপূর্ণ অধ্যায় থেকে"} ${count}টি MCQ প্রশ্ন তৈরি করো।

মনে রাখো:
- NCTB পাঠ্যবই (nctb.gov.bd) এর ক্লাস ${cls} এর "${subject}" বই থেকে তথ্য নাও
- ${parseInt(cls) <= 5 ? "প্রশ্ন সরল ও বোধগম্য হবে" : parseInt(cls) <= 8 ? "প্রশ্ন মাঝারি মানের হবে" : parseInt(cls) <= 10 ? "প্রশ্ন SSC বোর্ড পরীক্ষার মানের হবে" : "প্রশ্ন HSC বোর্ড পরীক্ষার মানের হবে"}
- তথ্যভিত্তিক, প্রয়োগমূলক এবং বিশ্লেষণমূলক প্রশ্নের সমন্বয় রাখো`;
    }

    prompt += `\n\nপ্রতিটি প্রশ্নের জন্য:
- প্রশ্ন (বাংলায়)
- ৪টি অপশন
- সঠিক উত্তরের ইনডেক্স (0-3)
- সংক্ষিপ্ত ব্যাখ্যা (NCTB পাঠ্যবই অনুসারে কেন এটি সঠিক)

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
            content: `তুমি বাংলাদেশ NCTB (জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড, nctb.gov.bd) সিলেবাসের একজন অত্যন্ত দক্ষ শিক্ষক।

তোমার নিয়ম:
1. শুধুমাত্র নির্দিষ্ট ক্লাসের NCTB পাঠ্যবইয়ের কন্টেন্ট থেকে প্রশ্ন করবে — অন্য ক্লাসের কন্টেন্ট মেশাবে না
2. PDF-এর ফরম্যাট, সাইজ, কভার পেজ, সূচিপত্র, লেখক, প্রকাশনা — এগুলো নিয়ে কখনোই প্রশ্ন করবে না
3. প্রশ্ন হবে পাঠ্যবইয়ের মূল বিষয়বস্তু (তত্ত্ব, সূত্র, ধারণা, তথ্য, ঘটনা, সংজ্ঞা) থেকে
4. প্রশ্নের মান বোর্ড পরীক্ষার সমতুল্য হতে হবে
5. ব্যাখ্যায় পাঠ্যবইয়ের কোন অংশ/অধ্যায় থেকে উত্তর পাওয়া যায় সেটি উল্লেখ করো`,
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
