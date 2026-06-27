import { NextResponse } from 'next/server';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Dev-only: persists the isometric sprite layout edited in the admin editor.
const LAYOUT_PATH = join(process.cwd(), 'public', 'playmanager', 'iso', 'sprites-layout.json');

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'disabled in production' }, { status: 403 });
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
