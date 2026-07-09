// Pure localStorage helpers for the (client-side, mock) game-invite feature.
// Extracted from invite-button.tsx so the global chrome (notification-bell in
// the site header) can use them WITHOUT importing the InviteButton component —
// which pulls in mockGames and would otherwise ship the game catalog on every
// route.

export interface GameInvite {
  id: string;
  fromUsername: string;
  fromDisplay: string;
  toUsername: string;
  gameSlug: string;
  gameName: string;
  sentAt: number;
}

export function saveInvite(invite: GameInvite) {
  try {
    const key = `gameroom_invites_${invite.toUsername}`;
    const existing: GameInvite[] = JSON.parse(localStorage.getItem(key) ?? "[]");
    existing.push(invite);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {}
}

export function loadAndClearInvites(username: string): GameInvite[] {
  try {
    const key = `gameroom_invites_${username}`;
    const invites: GameInvite[] = JSON.parse(localStorage.getItem(key) ?? "[]");
    localStorage.removeItem(key);
    return invites;
  } catch {
    return [];
  }
}
