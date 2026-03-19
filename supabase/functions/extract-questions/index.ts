import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageType, subject, classLevel, questionCount, title } = await req.json();

    if (!imageBase64) {
      throw new Error("Image data is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const qCount = questionCount || 25;

    const systemPrompt = `তুমি একজন বাংলাদেশের NCTB পাঠ্যক্রমের বিশেষজ্ঞ MCQ প্রশ্ন নির্মাতা।

তোমাকে একটি ছবি/পিডিএফ দেওয়া হবে যেখানে প্রশ্ন, মানবন্টন, বা পাঠ্য বিষয়বস্তু থাকতে পারে। তুমি এই ছবি/পিডিএফটি খুব মনোযোগ দিয়ে পড়বে এবং বিশ্লেষণ করবে।

⚠️ অত্যন্ত গুরুত্বপূর্ণ নিয়ম:
1. ছবিতে যদি সরাসরি MCQ প্রশ্ন থাকে, সেগুলো হুবহু extract করো — প্রশ্ন, অপশন, সঠিক উত্তর সব ঠিকঠাক রাখো
2. ছবিতে যদি পাঠ্য বিষয়বস্তু/নোট থাকে, সেখান থেকে বোর্ড পরীক্ষার মানের MCQ তৈরি করো
3. ছবিতে যদি মানবন্টন/সিলেবাস থাকে, সেই অনুযায়ী প্রশ্ন তৈরি করো
4. প্রতিটি প্রশ্নের ৪টি অপশন থাকবে (ক, খ, গ, ঘ)
5. correctIndex অবশ্যই ১০০% সঠিক হতে হবে (0=ক, 1=খ, 2=গ, 3=ঘ)
6. প্রতিটি প্রশ্নের ব্যাখ্যা বাংলায় দাও
7. ক্লাস ${classLevel || "9-10"} এর মানের প্রশ্ন করো
8. বিষয়: ${subject || "সাধারণ"}

মোট ${qCount}টি MCQ প্রশ্ন দাও।

JSON ফরম্যাটে উত্তর দাও:
{
  "questions": [
    {
      "question": "প্রশ্ন?",
      "options": ["ক অপশন", "খ অপশন", "গ অপশন", "ঘ অপশন"],
      "correctIndex": 0,
      "explanation": "ব্যাখ্যা"
    }
  ],
  "extractedTitle": "ছবি থেকে চিহ্নিত বিষয়/অধ্যায়ের নাম"
}

শুধুমাত্র JSON দাও, অতিরিক্ত কোনো টেক্সট দিও না।`;

    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `এই ছবি/পিডিএফটি মনোযোগ দিয়ে পড়ো এবং ${qCount}টি MCQ প্রশ্ন তৈরি করো। বিষয়: ${subject || "ছবি থেকে চিহ্নিত করো"}। ক্লাস: ${classLevel || "9-10"}।`,
              },
              {
                type: "image_url",
                image_url: { url: `data:${imageType || "image/jpeg"};base64,${imageBase64}` },
              },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("API error:", errText);
      throw new Error("AI API failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    const cleanContent = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error("Could not parse AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate questions
    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error("No questions extracted");
    }

    // Sanitize correctIndex
    parsed.questions = parsed.questions.map((q: any) => ({
      question: q.question || "",
      options: Array.isArray(q.options) ? q.options.slice(0, 4) : ["", "", "", ""],
      correctIndex: typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex <= 3 ? q.correctIndex : 0,
      explanation: q.explanation || "",
    }));

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
