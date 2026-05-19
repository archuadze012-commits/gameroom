import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM = `You are a content moderator for a gaming community chat.
Determine if the message contains toxic content: hate speech, slurs, harassment, explicit threats, or severe profanity.
Normal gaming language, mild frustration, and competitive banter are acceptable.
Respond ONLY with valid JSON, no extra text: {"toxic": true} or {"toxic": false}`;

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
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM,
      generationConfig: { maxOutputTokens: 20, temperature: 0 },
    });

    const result = await model.generateContent(message);
    const text = result.response.text().trim();

    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json({ toxic: !!parsed.toxic });
  } catch (e) {
    console.error("[/api/moderate]", e);
    return NextResponse.json({ toxic: false });
  }
}
