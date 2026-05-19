import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ toxic: false });

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ toxic: false });
  }

  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ toxic: false });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a content moderator for a gaming community chat.
Determine if the message below contains toxic content: hate speech, slurs, harassment, explicit threats, or severe profanity.
Normal gaming language and competitive banter are acceptable.
Respond ONLY with valid JSON, nothing else: {"toxic": true} or {"toxic": false}

Message: "${message.replace(/"/g, "'")}"`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 20, temperature: 0 },
    });

    const text = result.response.text().trim().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);
    return NextResponse.json({ toxic: !!parsed.toxic });
  } catch (e) {
    console.error("[/api/moderate]", e);
    return NextResponse.json({ toxic: false });
  }
}
