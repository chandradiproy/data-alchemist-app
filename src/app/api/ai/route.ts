// src/app/api/ai/route.ts

import Groq from "groq-sdk";

// Initialize the Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * POST handler for the Groq API route.
 * @param {Request} req - The incoming request.
 * @returns {Promise<Response>} - The response from the API.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    // The request body is now expected to be JSON, not FormData
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Call the Groq API
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama3-8b-8192", // Or another model like "mixtral-8x7b-32768"
      temperature: 0.1,
      max_tokens: 1024,
      top_p: 1,
    });

    const text = chatCompletion.choices[0]?.message?.content || "";

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in Groq API route:", error);
    return new Response(JSON.stringify({ error: error.message || "An unknown error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
