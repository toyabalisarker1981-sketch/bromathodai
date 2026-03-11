import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fileUrl, fileName, sourceType, customPrompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = sourceType === "image"
      ? `তুমি একজন বাংলাদেশী শিক্ষক। এই ছবিটি বিশ্লেষণ করো এবং এর উপর একটি সুন্দর হ্যান্ড নোট তৈরি করো।

ছবির URL: ${fileUrl}
ফাইলের নাম: ${fileName}

নিচের ফরম্যাটে নোট তৈরি করো:

# 📝 ${fileName} — হ্যান্ড নোট

## 🎯 মূল বিষয়বস্তু
(ছবি থেকে যা বোঝা যাচ্ছে তার সারমর্ম)

## 📌 গুরুত্বপূর্ণ পয়েন্টস
- পয়েন্ট ১
- পয়েন্ট ২
- পয়েন্ট ৩

## 💡 সহজ ব্যাখ্যা
(সহজ ভাষায় ব্যাখ্যা)

## ✏️ মনে রাখার টিপস
(কিভাবে এই বিষয়টা সহজে মনে রাখা যায়)

---
## 📚 কিভাবে পড়বে?
1. প্রথমে মূল বিষয়বস্তু ভালোভাবে পড়ো
2. গুরুত্বপূর্ণ পয়েন্টগুলো হাইলাইট করো
3. নিজের ভাষায় লিখে প্র্যাকটিস করো
4. পরের দিন আবার রিভিশন দাও
5. AI টিউটরকে প্রশ্ন করো যদি কিছু বুঝতে না পারো`
      : `তুমি একজন বাংলাদেশী শিক্ষক। এই PDF ফাইলের নাম দেখে এবং বিষয়বস্তু অনুমান করে একটি সুন্দর ও বিস্তারিত হ্যান্ড নোট তৈরি করো।

PDF ফাইলের নাম: ${fileName}
PDF URL: ${fileUrl}

নিচের ফরম্যাটে নোট তৈরি করো:

# 📝 ${fileName} — হ্যান্ড নোট

## 🎯 বিষয়বস্তুর সারমর্ম
(ফাইলের নাম থেকে যা বোঝা যাচ্ছে তার উপর বিস্তারিত আলোচনা)

## 📌 গুরুত্বপূর্ণ পয়েন্টস
- পয়েন্ট ১ (বিস্তারিত ব্যাখ্যাসহ)
- পয়েন্ট ২ (বিস্তারিত ব্যাখ্যাসহ)
- পয়েন্ট ৩ (বিস্তারিত ব্যাখ্যাসহ)
- পয়েন্ট ৪ (বিস্তারিত ব্যাখ্যাসহ)
- পয়েন্ট ৫ (বিস্তারিত ব্যাখ্যাসহ)

## 💡 সহজ ব্যাখ্যা
(জটিল বিষয়গুলো সহজ ভাষায় ব্যাখ্যা করো, উদাহরণসহ)

## 🔢 সূত্র / ফর্মুলা (যদি প্রযোজ্য হয়)
(LaTeX ফরম্যাটে সূত্র দাও: $...$ বা $$...$$)

## ✏️ মনে রাখার টিপস
- Mnemonic বা শর্টকাট টেকনিক
- সহজ উদাহরণ দিয়ে মনে রাখার উপায়

## 📊 তুলনামূলক চার্ট (যদি প্রযোজ্য হয়)
| বিষয় | বিবরণ |
|-------|--------|
| ... | ... |

---
## 📚 কিভাবে এই নোট পড়বে?
1. 🔍 প্রথমে সম্পূর্ণ নোটটি একবার চোখ বুলিয়ে নাও
2. ✍️ গুরুত্বপূর্ণ পয়েন্টগুলো খাতায় লিখো
3. 🧠 সূত্রগুলো মুখস্ত করো এবং প্র্যাকটিস করো
4. 📖 পরের দিন সকালে ১৫ মিনিট রিভিশন দাও
5. ❓ যা বুঝতে পারোনি AI টিউটরকে জিজ্ঞেস করো
6. 📝 সপ্তাহে একবার পুরো নোট রিভিউ করো
7. 🎯 কুইজ দিয়ে নিজেকে যাচাই করো`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "তুমি একজন দক্ষ বাংলাদেশী শিক্ষক। শিক্ষার্থীদের জন্য সুন্দর, বিস্তারিত হ্যান্ড নোট তৈরি করো। Markdown ফরম্যাট ব্যবহার করো। গণিতের সূত্র LaTeX এ লেখো।" },
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
