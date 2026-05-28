# Phase 1 Plan: Server Action Migration

## Goal
Migrate `/api/lfg` and `/api/posts` endpoints to Server Actions to improve type safety, reduce client-side boilerplate, and follow modern Next.js patterns.

## Requirements
- Create `src/app/lfg/new/actions.ts` and `src/app/feed/actions.ts`.
- Use `useActionState` (React 19/Next.js 15) for form handling.
- Implement Zod validation for inputs.
- Incorporate `awardXp` logic from `@/lib/gamification`.
- Provide UI feedback via `toast` (sonner/shadcn).
- **Revalidation:** Use `revalidatePath` to ensure data consistency.
- **Error Mapping:** Return structured state `{ success: boolean, message?: string, errors?: Record<string, string[]> }`.
- **Security:** Strict auth checks using `getSession()`.

## Proposed Changes

### 1. LFG Migration
- **New Action:** `src/app/lfg/new/actions.ts`
  - Define `createLfgAction` using `createSupabaseServerClient`.
  - Include validation (Zod).
  - Include moderation check (`moderateText`).
  - Award 5 XP on success.
  - `revalidatePath('/lfg')` and `revalidatePath('/')`.
- **Form Update:** `src/app/lfg/new/new-lfg-form.tsx`
  - Replace `fetch` with `useActionState`.
  - Use `isPending` for loading states.
  - Handle success/error messages via `toast`.

### 2. Posts Migration
- **New Action:** `src/app/feed/actions.ts`
  - Define `createPostAction`.
  - Include validation.
  - Award 10 XP on success.
  - `revalidatePath('/feed')` and `revalidatePath('/')`.
- **Form Update:** `src/app/feed/feed-client.tsx` (or where the post form lives).
  - Replace `fetch` with `useActionState`.
  - Handle media URLs.

## Verification Plan
- [ ] Manual test: Create a new LFG post. Verify XP is awarded.
- [ ] Manual test: Create a new feed post. Verify XP is awarded.
- [ ] Verify validation errors are shown in the UI.
- [ ] Verify toast feedback on success/failure.
- [ ] Verify pages revalidate correctly.
