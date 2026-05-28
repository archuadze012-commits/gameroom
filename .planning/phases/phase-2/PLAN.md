# Phase 2 Plan: Tournament MVP Completion

## Goal
Complete the end-to-end tournament flow by implementing match result reporting and migrating existing tournament endpoints to Server Actions.

## Requirements
- Create `src/app/tournaments/[slug]/actions.ts` for tournament mutations.
- Migrate `handleRegister` and `handleCheckin` to Server Actions.
- Implement `reportMatchScoreAction` for players.
- Update `TournamentActions` component to support match reporting when a tournament is LIVE.
- Add a "My Active Match" section to the tournament detail page.

## Proposed Changes

### 1. Server Actions
- **New File:** `src/app/tournaments/[slug]/actions.ts`
  - `registerForTournamentAction`
  - `checkinForTournamentAction`
  - `reportMatchScoreAction` (includes validation: only players in the match can report).
  - Use `revalidatePath('/tournaments/[slug]')`.

### 2. UI Updates
- **`TournamentActions.tsx`:**
  - Convert to use `useActionState`.
  - Add logic to display active match reporting form when `status === 'live'`.
- **`src/app/tournaments/[slug]/page.tsx`:**
  - Fetch the current user's active match if the tournament is live.
  - Pass active match data to the client component.

### 3. Database / Security
- Ensure `tournament_matches` allows updating scores by participants (or use a service-role RPC for reporting).
- Current RLS: `tm_admin_write` (admin/organizer only). We need a policy or RPC for player reporting.

## Verification Plan
- [ ] Manual test: Register for a tournament.
- [ ] Manual test: Check-in during the check-in window.
- [ ] Manual test: Report a score as Player 1. Verify Player 2 can see it (or confirm it).
- [ ] Verify XP/NC rewards (if applicable).
