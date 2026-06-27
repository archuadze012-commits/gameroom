import { NextResponse } from 'next/server';
import sharp from 'sharp';

export const runtime = 'nodejs';

const MAX_BYTES = 100 * 1024;
const MAX_WIDTH = 256;
const MAX_HEIGHT = 256;
const FALLBACK_QUALITY_STEPS = [68, 60, 52, 46, 40, 34];
const ALLOWED_HOSTS = new Set([
  'cdn.sofifa.net',
  'img.uefa.com',
  'sportrenders.com',
  'i.namu.wiki',
  'cdn.t3pedia.org',
  'www.mancity.com',
  'img.a.transfermarkt.technology',
  'rpmzlkjqyncusbptzics.supabase.co',
]);

function isAllowedRemoteUrl(raw: string) {
  try {
    const url = new URL(raw);
    return (url.protocol === 'https:' || url.protocol === 'http:') && ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

async function toSizedWebp(input: Buffer) {
  let output = await sharp(input)
    .resize(MAX_WIDTH, MAX_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: 72,
      effort: 4,
    })
    .toBuffer();

  if (output.byteLength <= MAX_BYTES) {
    return output;
  }

  for (const quality of FALLBACK_QUALITY_STEPS) {
    output = await sharp(input)
      .resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality,
        effort: 4,
      })
      .toBuffer();

    if (output.byteLength <= MAX_BYTES) {
      return output;
    }
  }

  return output;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get('src')?.trim();

  if (!src || !isAllowedRemoteUrl(src)) {
    return NextResponse.json({ error: 'invalid_src' }, { status: 400 });
  }

  try {
    const upstream = await fetch(src, {
      headers: {
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5',
        'User-Agent': 'Mozilla/5.0 PlayManagerCardImage/1.0',
      },
      cache: 'force-cache',
    });

    if (!upstream.ok) {
      return NextResponse.redirect(src, 302);
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      return NextResponse.redirect(src, 302);
    }

    const arrayBuffer = await upstream.arrayBuffer();
    const optimized = await toSizedWebp(Buffer.from(arrayBuffer));

    return new Response(new Uint8Array(optimized), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.redirect(src, 302);
  }
}
