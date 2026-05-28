# Requirements

## Functional Requirements
- **Authentication:**
  - Support Email magic links, Google OAuth, and Discord OAuth.
  - Automatic profile creation upon first sign-up.
- **LFG:**
  - Create, view, and filter LFG posts.
  - Join request flow with author approval.
  - Real-time comments on LFG posts.
- **Social Feed:**
  - Global and following-based feed.
  - Post creation with media support.
  - Reactions and @mentions.
- **Forums:**
  - Hierarchical categories and threads.
  - Threaded post replies.
  - Post liking and reactions.
- **News:**
  - Admin-managed articles.
  - User comments on articles.
- **Tournaments:**
  - Single-elimination bracket generation.
  - Participant registration and check-in.
  - Result reporting and admin verification.
- **Messaging:**
  - Real-time direct messages and channel chat.
- **Gamification:**
  - XP/Leveling system.
  - Virtual currencies (NC/PRO).
  - Daily bonuses and item shop.

## Non-Functional Requirements
- **Performance:** Sub-second page loads using Next.js 16 and Turbopack.
- **Scalability:** Leverage Supabase and Vercel for auto-scaling.
- **Security:** Rigorous RLS policies in PostgreSQL.
- **UI/UX:** Cyberpunk-themed dark UI with responsive design.

## Technical Mandates
- **Server Actions:** All data mutations MUST use Next.js Server Actions instead of traditional API routes where possible. This is required for optimal integration with React 19 and Next.js 16 features like `useActionState` and improved RSC-to-Server Action communication.
- **Type Safety:** 100% TypeScript coverage with Drizzle-generated types.
- **Real-time:** Use Supabase Realtime for chat and notifications.
