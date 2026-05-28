# Project State

## Current Focus
Migrating existing API-based data mutations to Next.js Server Actions to leverage React 19 and Next.js 16 benefits.

## Completed Milestones
- **Infrastructure:** Next.js 16, Tailwind v4, Drizzle ORM, Supabase Auth.
- **Database:** Full schema for Phase 1 (Profiles, LFG, Forums, News, Tournaments).
- **UI:** 12+ pages with cyberpunk theme and mock data.
- **Auth:** Email magic link and Google OAuth working.

## In Progress
- [ ] Refactoring LFG logic to Server Actions.
- [ ] Refactoring Social Feed (posts) logic to Server Actions.

## Blockers
- None currently.

## Next Steps
1. Create `src/lib/actions/lfg.ts` and `src/lib/actions/posts.ts`.
2. Update frontend components to use these actions.
3. Validate mutations with Server Components.
