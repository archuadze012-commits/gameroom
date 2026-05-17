import Link from "next/link";
import { Fragment } from "react";

// Matches @username (latin letters, digits, underscore) — capture the name only.
const MENTION_RE = /@([A-Za-z0-9_]+)/g;

/**
 * Renders message text, turning `@username` patterns into highlighted
 * clickable mentions that link to /profile/username. The `@` symbol itself
 * is intentionally not displayed — only the highlighted nickname.
 */
export function MentionText({ children }: { children: string }) {
  if (!children) return null;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  MENTION_RE.lastIndex = 0;
  while ((match = MENTION_RE.exec(children)) !== null) {
    const [whole, name] = match;
    const start = match.index;

    if (start > lastIndex) {
      parts.push(children.slice(lastIndex, start));
    }

    parts.push(
      <Link
        key={`m-${start}`}
        href={`/profile/${name}`}
        className="rounded bg-primary/15 px-1 py-0.5 font-medium text-primary transition-colors hover:bg-primary/25"
      >
        {name}
      </Link>,
    );

    lastIndex = start + whole.length;
  }

  if (lastIndex < children.length) {
    parts.push(children.slice(lastIndex));
  }

  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>{p}</Fragment>
      ))}
    </>
  );
}
