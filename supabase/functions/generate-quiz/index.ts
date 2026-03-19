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
        .slice(0, 12000);
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
    const { subject, classLevel, topic, customContent, questionCount, includeShortQuestions, includeAnalytical, questionType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const count = questionCount || 5;
    const cls = classLevel || "10";
    
    // questionType: "mcq" | "sq" | "cq" | "all" (default)
    const qType = questionType || "all";
    const wantMCQ = qType === "mcq" || qType === "all";
    const wantShort = (qType === "sq" || qType === "all") && includeShortQuestions !== false;
    const wantAnalytical = (qType === "cq" || qType === "all") && includeAnalytical !== false;

    const mcqCount = wantMCQ ? count : 0;
    const shortCount = wantShort ? (qType === "sq" ? count : Math.max(2, Math.ceil(count * 0.4))) : 0;
    const analyticalCount = wantAnalytical ? (qType === "cq" ? Math.max(3, Math.ceil(count * 0.5)) : Math.max(1, Math.ceil(count * 0.2))) : 0;

    const strictRules = `
তুমি একজন অত্যন্ত কঠোর ও নির্ভুল পরীক্ষার প্রশ্ন প্রণেতা।

⚠️ সর্বোচ্চ গুরুত্বপূর্ণ নিয়মাবলী:

📌 কন্টেন্ট বিশ্লেষণ নিয়ম:
1. সরবরাহকৃত কন্টেন্ট (PDF, URL, টেক্সট) সম্পূর্ণ এবং গভীরভাবে পড়ো ও বিশ্লেষণ করো
2. কন্টেন্টের প্রতিটি অনুচ্ছেদ, সংজ্ঞা, সূত্র, তথ্য, ঘটনা চিহ্নিত করো
3. শুধুমাত্র কন্টেন্টে যা আছে তা থেকেই প্রশ্ন করো — বাইরের কোনো জ্ঞান ব্যবহার করবে না
4. যদি কন্টেন্ট অপর্যাপ্ত হয়, "Insufficient content" বলো — অনুমান করে প্রশ্ন তৈরি করো না

📌 প্রশ্নের মান নিয়ম:
1. প্রশ্ন হবে বাংলাদেশ ${parseInt(cls) <= 8 ? "JSC/PSC" : parseInt(cls) <= 10 ? "SSC" : "HSC"} বোর্ড পরীক্ষার মানের
2. জেনেরিক বা সাধারণ প্রশ্ন এড়িয়ে চলো — প্রশ্ন হবে পরীক্ষায় আসার মতো গুরুত্বপূর্ণ
3. তথ্যভিত্তিক, প্রয়োগমূলক ও বিশ্লেষণমূলক — তিন ধরনের মিশ্রণ রাখো
4. ${parseInt(cls) <= 5 ? "প্রশ্ন সরল ও বোধগম্য" : parseInt(cls) <= 8 ? "মাঝারি কঠিন" : parseInt(cls) <= 10 ? "SSC বোর্ড পরীক্ষার মান" : "HSC বোর্ড পরীক্ষার মান"}

📌 MCQ নিয়ম:
1. প্রতিটি MCQ-তে ৪টি অপশন থাকবে — একটি সঠিক, বাকি ৩টি যুক্তিসঙ্গত কিন্তু ভুল
2. অপশনগুলো যেন বিভ্রান্তিকর হয় কিন্তু ভালোভাবে পড়লে সঠিকটি চেনা যায়
3. সঠিক উত্তরটি নির্ভুলভাবে চিহ্নিত করো — ভুল correctIndex দিলে পুরো সিস্টেম নষ্ট হয়
4. ব্যাখ্যায় কেন এটি সঠিক এবং অন্যগুলো ভুল — উভয়ই স্পষ্ট করো

📌 সম্পূর্ণ উপেক্ষা করো:
- PDF-এর সাইজ, ফরম্যাট, ফাইলের নাম, কভার পেজ, কভারের রঙ/ডিজাইন
- সূচিপত্র (Index), পৃষ্ঠা নম্বর, লেখক/প্রকাশক তথ্য, ISBN, কপিরাইট
- ছবির ক্যাপশন, রেফারেন্স নম্বর, হেডার/ফুটার

📌 প্রশ্ন তৈরির আগে:
1. কন্টেন্ট থেকে মূল ধারণা/কনসেপ্টগুলো চিহ্নিত করো
2. গুরুত্বপূর্ণ সংজ্ঞা, সূত্র ও তথ্যগুলো শনাক্ত করো
3. পরীক্ষায় আসার সম্ভাবনা আছে এমন টপিকগুলো নির্ধারণ করো
4. তারপর শুধু সেগুলো থেকেই প্রশ্ন তৈরি করো
`;

    let prompt = "";
    if (customContent) {
      const urlMatch = customContent.match(/https?:\/\/[^\s]+/);
      let enrichedContent = customContent;
      if (urlMatch) {
        const fetchedContent = await fetchUrlContent(urlMatch[0]);
        enrichedContent = `${customContent}\n\nওয়েবসাইট/ভিডিও থেকে পাওয়া কন্টেন্ট:\n${fetchedContent}`;
      }

      prompt = `${strictRules}

ক্লাস: ${cls}
বিষয়: ${subject || "সাধারণ"}
${topic ? `অধ্যায়/টপিক: ${topic}` : ""}

নিচের কন্টেন্ট অত্যন্ত মনোযোগ দিয়ে পড়ো এবং গভীরভাবে বিশ্লেষণ করো। প্রতিটি লাইন, সংজ্ঞা, তথ্য ও ধারণা বুঝো।

কন্টেন্ট:
${enrichedContent}

এই কন্টেন্ট থেকে ${count}টি MCQ${shortCount > 0 ? `, ${shortCount}টি সংক্ষিপ্ত প্রশ্ন` : ""}${analyticalCount > 0 ? ` এবং ${analyticalCount}টি বিশ্লেষণমূলক/সৃজনশীল প্রশ্ন` : ""} তৈরি করো।`;
    } else {
      prompt = `${strictRules}

ক্লাস: ${cls}
বিষয়: ${subject || "সাধারণ"}
${topic ? `অধ্যায়/টপিক: ${topic}` : ""}

NCTB (nctb.gov.bd) এর ক্লাস ${cls} এর "${subject}" বইয়ের ${topic ? `"${topic}" অধ্যায় থেকে` : "বিভিন্ন গুরুত্বপূর্ণ অধ্যায় থেকে"} ${count}টি MCQ${shortCount > 0 ? `, ${shortCount}টি সংক্ষিপ্ত প্রশ্ন` : ""}${analyticalCount > 0 ? ` এবং ${analyticalCount}টি বিশ্লেষণমূলক/সৃজনশীল প্রশ্ন` : ""} তৈরি করো।

মনে রাখো:
- NCTB পাঠ্যবই (nctb.gov.bd) এর ক্লাস ${cls} এর "${subject}" বই থেকে তথ্য নাও
- তথ্যভিত্তিক, প্রয়োগমূলক এবং বিশ্লেষণমূলক প্রশ্নের সমন্বয় রাখো`;
    }

    prompt += `

IMPORTANT: তোমাকে অবশ্যই suggest_quiz tool ব্যবহার করে উত্তর দিতে হবে।

MCQ-এর জন্য:
- প্রশ্ন (বাংলায়)
- ৪টি অপশন
- সঠিক উত্তরের ইনডেক্স (0-3) — এটি ১০০% নির্ভুল হতে হবে
- বিস্তারিত ব্যাখ্যা (কেন এটি সঠিক এবং অন্যগুলো কেন ভুল)

${shortCount > 0 ? `সংক্ষিপ্ত প্রশ্নের জন্য:
- প্রশ্ন (বাংলায়)
- আদর্শ উত্তর (2-4 বাক্যে)` : ""}

${analyticalCount > 0 ? `বিশ্লেষণমূলক/সৃজনশীল প্রশ্নের জন্য:
- প্রশ্ন (বাংলায়)
- নির্দেশনা/গাইডলাইন (কীভাবে উত্তর লিখতে হবে)
- মূল পয়েন্টগুলো যা উত্তরে থাকা উচিত` : ""}`;

    // Build tools with conditional short/analytical question schemas
    const toolProperties: Record<string, any> = {
      questions: {
        type: "array",
        description: "MCQ questions",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            options: { type: "array", items: { type: "string" } },
            correctIndex: { type: "number", description: "0-3 index of the correct answer - MUST be accurate" },
            explanation: { type: "string" },
          },
          required: ["question", "options", "correctIndex", "explanation"],
          additionalProperties: false,
        },
      },
    };

    const requiredFields = ["questions"];

    if (shortCount > 0) {
      toolProperties.shortQuestions = {
        type: "array",
        description: "Short answer questions",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            answer: { type: "string" },
          },
          required: ["question", "answer"],
          additionalProperties: false,
        },
      };
      requiredFields.push("shortQuestions");
    }

    if (analyticalCount > 0) {
      toolProperties.analyticalQuestions = {
        type: "array",
        description: "Analytical/creative questions",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            guidelines: { type: "string" },
            keyPoints: { type: "array", items: { type: "string" } },
          },
          required: ["question", "guidelines", "keyPoints"],
          additionalProperties: false,
        },
      };
      requiredFields.push("analyticalQuestions");
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
          {
            role: "system",
            content: `তুমি বাংলাদেশ NCTB (জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড, nctb.gov.bd) সিলেবাসের একজন অত্যন্ত কঠোর ও নির্ভুল পরীক্ষার প্রশ্ন প্রণেতা।

তোমার অলঙ্ঘনীয় নিয়ম:
1. শুধুমাত্র সরবরাহকৃত কন্টেন্ট বা নির্দিষ্ট ক্লাসের NCTB পাঠ্যবই থেকে প্রশ্ন করবে
2. বাইরের কোনো জ্ঞান, অনুমান বা ধারণার উপর ভিত্তি করে প্রশ্ন করবে না
3. PDF-এর ফরম্যাট, সাইজ, কভার পেজ, সূচিপত্র, লেখক, প্রকাশনা — এগুলো নিয়ে কখনোই প্রশ্ন করবে না
4. প্রশ্ন হবে পাঠ্যবইয়ের মূল বিষয়বস্তু (তত্ত্ব, সূত্র, ধারণা, তথ্য, ঘটনা, সংজ্ঞা) থেকে
5. প্রশ্নের মান বোর্ড পরীক্ষার সমতুল্য হতে হবে — জেনেরিক প্রশ্ন গ্রহণযোগ্য নয়
6. MCQ-র correctIndex ১০০% নির্ভুল হতে হবে — ভুল correctIndex দেওয়া সম্পূর্ণ নিষিদ্ধ
7. ব্যাখ্যায় পাঠ্যবইয়ের কোন অংশ/অধ্যায় থেকে উত্তর পাওয়া যায় সেটি উল্লেখ করো
8. তুমি নিশ্চিত না হলে প্রশ্ন তৈরি করবে না — "Insufficient content" বলো`,
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_quiz",
              description: "Return quiz questions in structured format with MCQs, short questions, and analytical questions",
              parameters: {
                type: "object",
                properties: toolProperties,
                required: requiredFields,
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
