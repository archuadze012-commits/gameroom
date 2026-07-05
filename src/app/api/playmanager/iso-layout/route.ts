import { NextResponse } from 'next/server';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Dev-only: persists the isometric sprite layout edited in the admin editor.
const LAYOUT_PATH = join(process.cwd(), 'public', 'playmanager', 'iso', 'sprites-layout.json');

export async function POST(request: Request) {
  // Allow ONLY local development — an env other than 'development' (production,
  // test, a misconfigured staging build) must never accept unauthenticated
  // filesystem writes. Positive check beats the old `=== 'production'` block.
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'dev_only' }, { status: 403 });
  }
  try {
    const body = await request.json();
    if (!body || !Array.isArray(body.sprites)) {
      return NextResponse.json({ error: 'expected { sprites: [...] }' }, { status: 400 });
    }
    await writeFile(LAYOUT_PATH, JSON.stringify({ sprites: body.sprites }, null, 2) + '\n', 'utf8');
    return NextResponse.json({ ok: true, count: body.sprites.length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
