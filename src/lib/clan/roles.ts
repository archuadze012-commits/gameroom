// Clan role model: leader / co_leader / manager / member.
//
// The three non-member roles form the "management" tier — they can post
// announcements, invite, register the clan for tournaments, and manage
// lineup / schedule / treasury. The LEADER alone keeps ownership actions
// (promote/demote, transfer leadership, disband, edit clan). A member can kick
// anyone strictly below them in rank (see CLAN_ROLE_ORDER).
//
// ('officer' is a deprecated legacy enum value — no rows use it; not exposed.)

export const CLAN_MANAGER_ROLES = ["leader", "co_leader", "manager"] as const;

// Lower number = higher rank. Drives sorting and who-can-kick-whom.
export const CLAN_ROLE_ORDER: Record<string, number> = {
  leader: 0,
  co_leader: 1,
  manager: 2,
  officer: 2, // legacy, treated like a manager if any old row lingers
  member: 3,
};

export const CLAN_ROLE_LABEL: Record<string, string> = {
  leader: "ლიდერი",
  co_leader: "Co-ლიდერი",
  manager: "მენეჯერი",
  officer: "Co-ლიდერი", // legacy fallback
  member: "წევრი",
};

// Short, human-readable summary of what each role is responsible for. Shown on
// the roster next to the role so members and visitors understand the hierarchy.
// Kept truthful to the actual permission model above.
export const CLAN_ROLE_DESC: Record<string, string> = {
  leader: "კლანის მფლობელი — როლების დანიშვნა, ლიდერობის გადაცემა, რედაქტირება და დაშლა",
  co_leader: "ლიდერის მარჯვენა ხელი — მოწვევა, განცხადებები, ტურნირზე რეგისტრაცია, შემადგენლობა და ხაზინა",
  manager: "ყოველდღიური მართვა — მოწვევა, განცხადებები, ტურნირზე რეგისტრაცია და შემადგენლობა",
  officer: "ლიდერის მარჯვენა ხელი — მოწვევა, განცხადებები, ტურნირზე რეგისტრაცია, შემადგენლობა და ხაზინა", // legacy
  member: "წევრი — თამაში, ჰაილაითების გაზიარება და გამოკითხვებში ხმის მიცემა",
};

// Roles the leader can assign to another member.
export const ASSIGNABLE_CLAN_ROLES = ["co_leader", "manager", "member"] as const;
export type AssignableClanRole = (typeof ASSIGNABLE_CLAN_ROLES)[number];

export function isClanManager(role: string | null | undefined): boolean {
  return role != null && (CLAN_MANAGER_ROLES as readonly string[]).includes(role);
}

export function clanRoleLabel(role: string | null | undefined): string {
  return (role && CLAN_ROLE_LABEL[role]) || "წევრი";
}

export function clanRoleDesc(role: string | null | undefined): string {
  return (role && CLAN_ROLE_DESC[role]) || CLAN_ROLE_DESC.member;
}

export function clanRoleRank(role: string | null | undefined): number {
  if (!role) return 9;
  const rank = CLAN_ROLE_ORDER[role];
  return rank ?? 9;
}
