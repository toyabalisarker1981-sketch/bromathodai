import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subject, classLevel, topic, customContent, questionCount } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const count = questionCount || 5;

    let prompt = "";
    if (customContent) {
      prompt = `নিচের কন্টেন্ট থেকে ${count}টি MCQ প্রশ্ন তৈরি করো:

কন্টেন্ট: ${customContent}

`;
    } else {
      prompt = `বাংলাদেশ NCTB সিলেবাস অনুযায়ী ক্লাস ${classLevel} এর "${subject}" বিষয়ের ${topic ? `"${topic}" টপিক থেকে` : "বিভিন্ন গুরুত্বপূর্ণ টপিক থেকে"} ${count}টি MCQ প্রশ্ন তৈরি করো।

`;
    }

    prompt += `প্রতিটি প্রশ্নের জন্য:
- প্রশ্ন (বাংলায়)
- ৪টি অপশন
- সঠিক উত্তরের ইনডেক্স (0-3)
- সংক্ষিপ্ত ব্যাখ্যা (কেন এটি সঠিক)

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
            content: "তুমি বাংলাদেশ NCTB সিলেবাসের একজন দক্ষ শিক্ষক। শিক্ষার্থীদের জন্য উচ্চমানের MCQ প্রশ্ন তৈরি করো। সব প্রশ্ন বাংলায় হবে। তোমাকে অবশ্যই suggest_quiz tool ব্যবহার করে structured format এ উত্তর দিতে হবে।",
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
