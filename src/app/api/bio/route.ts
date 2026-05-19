import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "no_key" }, { status: 500 });

  let body: { role?: string; games?: string[]; voiceChat?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }

  const role = body.role ?? "user";
  const games = (body.games ?? []).join(", ") || "სხვადასხვა";
  const voice = body.voiceChat ? "voice chat-ით" : "voice chat-ის გარეშე";

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "შენ ხელოვნური ინტელექტი ხარ, რომელიც Georgian gaming community-სთვის პროფილის bio-ებს წერ. " +
              "დაწერე მოკლე, ბუნებრივი bio (2-3 წინადადება) ქართულად, პირველი პირიდან. " +
              "Bio-ი უნდა ჟღერდეს პერსონალურად და ავტენტურად, არა რობოტულად. " +
              "მხოლოდ bio ტექსტი დააბრუნე, ბრჭყალების ან დამატებითი ფორმატირების გარეშე.",
          },
          {
            role: "user",
            content: `როლი: ${role}\nსაყვარელი თამაშები: ${games}\nთამაშის სტილი: ${voice}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
    });

    const json = await res.json();
    const bio: string = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!bio) throw new Error("empty response");
    return NextResponse.json({ bio });
  } catch (e) {
    console.error("[/api/bio]", e);
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }
}
