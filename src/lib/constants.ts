export const PROFILE_SHORT_TEXT_MAX_LENGTH = 32;
export const PROFILE_MEDIUM_TEXT_MAX_LENGTH = 64;
// Bio is a free-text paragraph (unbounded `text` column) — cap it so a
// multi-megabyte payload can't bloat storage or amplify the /api/users search
// response, while still comfortably fitting a real bio.
export const PROFILE_BIO_MAX_LENGTH = 500;

export const LFG_TITLE_MAX_LENGTH = 140;
export const LFG_DESCRIPTION_MAX_LENGTH = 2000;
export const LFG_SLOTS_DEFAULT = 4;
export const LFG_SLOTS_MAX = 10;

export const FORUM_REPLY_BODY_MAX_LENGTH = 5000;
export const FORUM_THREAD_TITLE_MAX_LENGTH = 200;
export const FORUM_THREAD_BODY_MAX_LENGTH = 10000;

export const COUNT_UP_ANIMATION_MS = 1400;
export const SAVED_FEEDBACK_MS = 1400;
export const CHAT_PREVIEW_DISMISS_MS = 5000;
export const INVITE_SENT_FEEDBACK_MS = 5000;
export const INVITE_TOAST_DURATION_MS = 15000;
export const NAV_BADGE_POLL_INTERVAL_MS = 30_000;
