import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to fetch content from URLs
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
          .slice(0, 10000);
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
    
    // If there's a URL, try to fetch its content first
    if (fileUrl && (sourceType === "youtube" || sourceType === "web" || sourceType === "url")) {
      enrichedContent = await fetchUrlContent(fileUrl);
    }

    let prompt = "";
    
    if (customPrompt) {
      // For custom prompts (CreateContent), also try to fetch URL content if present
      const urlMatch = customPrompt.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        const fetched = await fetchUrlContent(urlMatch[0]);
        prompt = `${customPrompt}\n\nওয়েবসাইট/ভিডিও থেকে পাওয়া কন্টেন্ট:\n${fetched}\n\n⚠️ গুরুত্বপূর্ণ: শুধুমাত্র উপরের কন্টেন্ট থেকে তৈরি করো।`;
      } else {
        prompt = customPrompt;
      }
    } else if (sourceType === "image") {
      prompt = `তুমি একজন বাংলাদেশী শিক্ষক। এই ছবিটি বিশ্লেষণ করো এবং এর উপর সুন্দর হ্যান্ড নোট তৈরি করো।

ছবির URL: ${fileUrl}
ফাইলের নাম: ${fileName}

# 📝 ${fileName} — হ্যান্ড নোট
## 🎯 মূল বিষয়বস্তু
## 📌 গুরুত্বপূর্ণ পয়েন্টস
## 💡 সহজ ব্যাখ্যা
## ✏️ মনে রাখার টিপস`;
    } else {
      prompt = `তুমি একজন বাংলাদেশী শিক্ষক। নিচের কন্টেন্ট ভালোভাবে পড়ো এবং বিশ্লেষণ করো, তারপর এর উপর বিস্তারিত হ্যান্ড নোট তৈরি করো।

ফাইলের নাম: ${fileName}
${enrichedContent ? `\nকন্টেন্ট:\n${enrichedContent}` : `URL: ${fileUrl}`}

⚠️ শুধুমাত্র উপরের কন্টেন্ট/বিষয়ের উপর ভিত্তি করে নোট তৈরি করো। বাইরের কোনো তথ্য যোগ করবে না।

নিচের ফরম্যাটে নোট তৈরি করো:

# 📝 ${fileName} — হ্যান্ড নোট

## 🎯 বিষয়বস্তুর সারমর্ম

## 📌 গুরুত্বপূর্ণ পয়েন্টস
- পয়েন্ট ১ (বিস্তারিত ব্যাখ্যাসহ)
- পয়েন্ট ২
- পয়েন্ট ৩

## 💡 সহজ ব্যাখ্যা

## 🔢 সূত্র / ফর্মুলা (যদি প্রযোজ্য হয়)
(LaTeX ফরম্যাটে: $...$ বা $$...$$)

## ✏️ মনে রাখার টিপস

## 📚 কিভাবে পড়বে?
1. প্রথমে সম্পূর্ণ নোটটি একবার চোখ বুলিয়ে নাও
2. গুরুত্বপূর্ণ পয়েন্টগুলো খাতায় লিখো
3. সূত্রগুলো মুখস্ত করো
4. পরের দিন রিভিশন দাও
5. AI টিউটরকে প্রশ্ন করো`;
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
          { role: "system", content: "তুমি একজন দক্ষ বাংলাদেশী শিক্ষক। শিক্ষার্থীদের জন্য সুন্দর, বিস্তারিত হ্যান্ড নোট তৈরি করো। Markdown ফরম্যাট ব্যবহার করো। গণিতের সূত্র LaTeX এ লেখো। যদি কোনো নির্দিষ্ট কন্টেন্ট/URL দেওয়া হয়, শুধুমাত্র সেই কন্টেন্ট থেকে নোট তৈরি করো।" },
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
