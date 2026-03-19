import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchUrlContent(url: string): Promise<string> {
  try {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) {
      return `এটি একটি YouTube ভিডিও (ID: ${ytMatch[1]})। URL: ${url}। এই ভিডিওর বিষয়বস্তু অনুমান করে নোট তৈরি করো।`;
    }

    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BroMathodBot/1.0)" },
    });
    if (resp.ok) {
      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        const text = await resp.text();
        const cleanText = text
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 12000);
        return cleanText || `URL: ${url}`;
      }
    }
  } catch (e) {
    console.error("URL fetch error:", e);
  }
  return `URL: ${url} — এই লিংকের বিষয়বস্তু থেকে নোট তৈরি করো।`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fileUrl, fileName, sourceType, customPrompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let enrichedContent = "";
    
    if (fileUrl && (sourceType === "youtube" || sourceType === "web" || sourceType === "url")) {
      enrichedContent = await fetchUrlContent(fileUrl);
    }

    const noteFormatInstructions = `
📐 ফরম্যাটিং নিয়ম (অত্যন্ত গুরুত্বপূর্ণ — অবশ্যই মানতে হবে):
- ❌ কখনোই টেবিল/ছক ব্যবহার করবে না — কোনো Markdown table (|---|---| স্টাইল) নয়
- ✅ পয়েন্ট আকারে (bullet points •, numbered lists 1. 2. 3.) তথ্য সাজাবে
- ✅ **বোল্ড** দিয়ে গুরুত্বপূর্ণ শব্দ, টার্ম ও কিওয়ার্ড হাইলাইট করবে
- ✅ *ইটালিক* দিয়ে উদাহরণ, ব্যাখ্যা ও নোট দেবে
- ✅ হেডিং (##, ###) দিয়ে সেকশন আলাদা করবে
- ✅ > blockquote দিয়ে গুরুত্বপূর্ণ সংজ্ঞা/সূত্র/তথ্য হাইলাইট করবে
- ✅ ইমোজি ব্যবহার করবে: 🟢 সহজ, 🟡 মাঝারি, 🔴 কঠিন/গুরুত্বপূর্ণ, 🔵 তথ্য/টিপস
- ✅ গণিতের সূত্র LaTeX-এ: $...$ (inline) এবং $$...$$ (display)

📌 কন্টেন্ট বিশ্লেষণ নিয়ম:
1. প্রথমে সম্পূর্ণ কন্টেন্ট (PDF/URL/ভিডিও) গভীরভাবে পড়ো ও বিশ্লেষণ করো
2. প্রতিটি অনুচ্ছেদ, সংজ্ঞা, সূত্র, তথ্য ও ঘটনা চিহ্নিত করো
3. কন্টেন্টে যা নেই তা যোগ করবে না — শুধুমাত্র দেওয়া তথ্য থেকে নোট তৈরি করো
4. কভার পেজ, সূচিপত্র, পৃষ্ঠা নম্বর, লেখক তথ্য, ISBN — সম্পূর্ণ উপেক্ষা করো`;

    let prompt = "";
    
    if (customPrompt) {
      const urlMatch = customPrompt.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        const fetched = await fetchUrlContent(urlMatch[0]);
        prompt = `${customPrompt}\n\nওয়েবসাইট/ভিডিও থেকে পাওয়া কন্টেন্ট:\n${fetched}\n\n${noteFormatInstructions}\n\n⚠️ গুরুত্বপূর্ণ: শুধুমাত্র উপরের কন্টেন্ট থেকে তৈরি করো।`;
      } else {
        prompt = `${customPrompt}\n\n${noteFormatInstructions}`;
      }
    } else if (sourceType === "image") {
      prompt = `তুমি একজন বাংলাদেশী শিক্ষক। এই ছবিটি গভীরভাবে বিশ্লেষণ করো — প্রতিটি লেখা, চিত্র, ডায়াগ্রাম মনোযোগ দিয়ে দেখো।

ছবির URL: ${fileUrl}
ফাইলের নাম: ${fileName}

${noteFormatInstructions}

নিচের ফরম্যাটে নোট তৈরি করো:

# 📝 ${fileName} — হ্যান্ড নোট

## 🔴 অত্যন্ত গুরুত্বপূর্ণ (Must Know)
*এই পয়েন্টগুলো পরীক্ষায় প্রায় সবসময় আসে*
- পয়েন্ট ১ (বিস্তারিত ব্যাখ্যাসহ)
- পয়েন্ট ২

## 🟡 মাঝারি গুরুত্বপূর্ণ (Should Know)
*এগুলো বোর্ড পরীক্ষায় মাঝে মাঝে আসে*
- পয়েন্ট ১
- পয়েন্ট ২

## 🟢 সাধারণ গুরুত্ব (Good to Know)
*এগুলো জানা থাকলে ভালো, বোনাস মার্কস পেতে সাহায্য করবে*
- পয়েন্ট ১

## 💡 সহজ ব্যাখ্যা

## 🔢 সূত্র / ফর্মুলা (যদি প্রযোজ্য হয়)

## ✏️ মনে রাখার টিপস

## 📋 পরীক্ষায় যেভাবে প্রশ্ন আসতে পারে
### 🔹 টাইপ ১: সংজ্ঞামূলক প্রশ্ন
### 🔹 টাইপ ২: প্রয়োগমূলক প্রশ্ন
### 🔹 টাইপ ৩: সৃজনশীল/সৃজনশীল প্রশ্ন`;
    } else {
      prompt = `তুমি একজন বাংলাদেশী শিক্ষক। নিচের কন্টেন্ট অত্যন্ত মনোযোগ দিয়ে পড়ো — প্রতিটি লাইন, প্রতিটি তথ্য, প্রতিটি সংজ্ঞা গভীরভাবে বিশ্লেষণ করো। তাড়াহুড়ো করবে না — ধীরে ধীরে সুন্দর করে নোট তৈরি করো।

ফাইলের নাম: ${fileName}
${enrichedContent ? `\nকন্টেন্ট:\n${enrichedContent}` : `URL: ${fileUrl}`}

⚠️ শুধুমাত্র উপরের কন্টেন্ট/বিষয়ের উপর ভিত্তি করে নোট তৈরি করো। বাইরের কোনো তথ্য যোগ করবে না। অহেতুক বা অপ্রাসঙ্গিক প্রশ্ন তৈরি করবে না — যা কন্টেন্টে আছে শুধু সেটা থেকেই।

${noteFormatInstructions}

নিচের ফরম্যাটে নোট তৈরি করো:

# 📝 ${fileName} — হ্যান্ড নোট

## 🎯 বিষয়বস্তুর সারমর্ম
*কন্টেন্টের মূল ভাবটি ২-৩ বাক্যে*

## 🔴 অত্যন্ত গুরুত্বপূর্ণ (Must Know)
*এই পয়েন্টগুলো পরীক্ষায় প্রায় সবসময় আসে — এগুলো ভালো করে মুখস্ত করো*
- **পয়েন্ট ১**: বিস্তারিত ব্যাখ্যা
- **পয়েন্ট ২**: বিস্তারিত ব্যাখ্যা

## 🟡 মাঝারি গুরুত্বপূর্ণ (Should Know)
*এগুলো বোর্ড পরীক্ষায় মাঝে মাঝে আসে — জানা থাকলে ভালো মার্কস পাবে*
- **পয়েন্ট ১**: ব্যাখ্যা
- **পয়েন্ট ২**: ব্যাখ্যা

## 🟢 সাধারণ গুরুত্ব (Good to Know)
*এগুলো জানা থাকলে বোনাস মার্কস পেতে পারো*
- পয়েন্ট ১
- পয়েন্ট ২

## 💡 সহজ ভাষায় ব্যাখ্যা
*কঠিন বিষয়গুলো একদম সহজ করে, বাস্তব উদাহরণ দিয়ে বোঝাও*

## 🔢 সূত্র / ফর্মুলা (যদি প্রযোজ্য হয়)
> সূত্রগুলো LaTeX ফরম্যাটে: $...$ বা $$...$$

## ✏️ মনে রাখার টিপস ও শর্টকাট
*মনে রাখার সহজ উপায়, ট্রিক, মনেমনিক*

## 📋 পরীক্ষায় যেভাবে প্রশ্ন আসতে পারে

### 🔹 টাইপ ১: জ্ঞানমূলক / সংজ্ঞামূলক প্রশ্ন
*"সংজ্ঞা দাও", "কী?", "বলো" — এই ধরনের প্রশ্ন*
- সম্ভাব্য প্রশ্ন ১
- সম্ভাব্য প্রশ্ন ২

### 🔹 টাইপ ২: অনুধাবনমূলক / প্রয়োগমূলক প্রশ্ন
*"ব্যাখ্যা করো", "পার্থক্য লেখো", "গাণিতিক সমাধান" — এই ধরনের প্রশ্ন*
- সম্ভাব্য প্রশ্ন ১
- সম্ভাব্য প্রশ্ন ২

### 🔹 টাইপ ৩: উচ্চতর দক্ষতামূলক / সৃজনশীল প্রশ্ন
*"বিশ্লেষণ করো", "মূল্যায়ন করো", "তোমার মতামত দাও" — এই ধরনের প্রশ্ন*
- সম্ভাব্য প্রশ্ন ১
- সম্ভাব্য প্রশ্ন ২

## 📚 কিভাবে পড়বে? (Study Plan)
1. 🔴 প্রথমে "অত্যন্ত গুরুত্বপূর্ণ" পয়েন্টগুলো খাতায় লিখো
2. 🟡 তারপর "মাঝারি গুরুত্বপূর্ণ" পয়েন্টগুলো পড়ো
3. 🔢 সূত্রগুলো আলাদা করে মুখস্ত করো
4. 📋 সম্ভাব্য প্রশ্নগুলো নিজে উত্তর লেখার চেষ্টা করো
5. 🔄 পরের দিন পুরোটা একবার রিভিশন দাও
6. 🤖 AI টিউটরকে যেকোনো প্রশ্ন করো`;
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
          { role: "system", content: `তুমি একজন দক্ষ বাংলাদেশী শিক্ষক। শিক্ষার্থীদের জন্য সুন্দর, গোছানো, বিস্তারিত হ্যান্ড নোট তৈরি করো।

⚠️ অলঙ্ঘনীয় নিয়ম:
1. কখনোই Markdown টেবিল/ছক ব্যবহার করবে না (|---|---| স্টাইল নিষিদ্ধ)
2. পয়েন্ট আকারে (bullet, numbered list), বোল্ড, ইটালিক, blockquote ব্যবহার করবে
3. গণিতের সূত্র LaTeX-এ লেখো
4. গুরুত্ব অনুযায়ী 🔴🟡🟢 রঙিন ইমোজি দিয়ে সেকশন ভাগ করো
5. কন্টেন্ট যা দেওয়া হয় সেটি আগে সম্পূর্ণ পড়ো ও বিশ্লেষণ করো — তারপর ধীরে ধীরে সুন্দর করে নোট তৈরি করো
6. অহেতুক বা কন্টেন্টের বাইরে কোনো প্রশ্ন তৈরি করবে না
7. পরীক্ষায় যেভাবে প্রশ্ন আসতে পারে সেটি টাইপ ভিত্তিক করে সাজাও (জ্ঞানমূলক, অনুধাবনমূলক, সৃজনশীল)` },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI service error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "নোট তৈরি করা যায়নি।";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-notes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
