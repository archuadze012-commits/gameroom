import { NextResponse } from 'next/server';
import sharp from 'sharp';

export const runtime = 'nodejs';

const MAX_BYTES = 100 * 1024;
const MAX_WIDTH = 256;
const MAX_HEIGHT = 256;
const FETCH_TIMEOUT_MS = 8_000;
// Upstream input cap — independent of MAX_BYTES (which bounds our *output*
// webp). Without this a slow or misbehaving allowlisted host could stream an
// arbitrarily large body into memory before sharp ever sees it.
const MAX_UPSTREAM_BYTES = 12 * 1024 * 1024;
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
    // https only — every allowlisted host serves https, and browsers block
    // mixed content anyway, so the http downgrade path is dead weight + risk.
    return url.protocol === 'https:' && ALLOWED_HOSTS.has(url.hostname);
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(src, {
      headers: {
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5',
        'User-Agent': 'Mozilla/5.0 PlayManagerCardImage/1.0',
      },
      cache: 'force-cache',
      signal: controller.signal,
    });

    if (!upstream.ok) {
      return NextResponse.redirect(src, 302);
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      return NextResponse.redirect(src, 302);
    }

    const declaredLength = Number(upstream.headers.get('content-length') ?? NaN);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_UPSTREAM_BYTES) {
      return NextResponse.redirect(src, 302);
    }

    // Read the body ourselves with a hard cap, rather than trusting
    // content-length (absent or understated on some hosts) — a hostile or
    // compromised allowlisted origin could otherwise stream unbounded bytes
    // into memory before sharp ever runs.
    const reader = upstream.body?.getReader();
    if (!reader) return NextResponse.redirect(src, 302);
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_UPSTREAM_BYTES) {
        await reader.cancel();
        return NextResponse.redirect(src, 302);
      }
      chunks.push(value);
    }

    const optimized = await toSizedWebp(Buffer.concat(chunks));

    return new Response(new Uint8Array(optimized), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.redirect(src, 302);
  } finally {
    clearTimeout(timeout);
  }
}
