export type ClanMemberRole = "Leader" | "Officer" | "Member";

export type ClanMember = {
  id: string;
  name: string;
  role: ClanMemberRole;
  status: "online" | "away";
  contribution: number;
};

export type ClanApplication = {
  id: string;
  name: string;
  game: string;
  rank: string;
};

export type ClanInvite = {
  id: string;
  username: string;
  status: "sent" | "joined";
};

export type MyClanState = {
  name: string;
  tag: string;
  game: string;
  server: string;
  motto: string;
  recruiting: boolean;
  members: ClanMember[];
  applications: ClanApplication[];
  invites: ClanInvite[];
  activity: string[];
};

export const CLAN_STORAGE_KEY = "gameroom:my-clan:v1";

export function makeEmptyClan(name = "", tag = ""): MyClanState {
  return {
    name,
    tag,
    game: "PUBG Mobile",
    server: "Asia",
    motto: "",
    recruiting: true,
    members: [{ id: "m-1", name: "leonsio12", role: "Leader", status: "online", contribution: 0 }],
    applications: [],
    invites: [],
    activity: ["კლანი შეიქმნა"],
  };
}

export function readClanFromStorage() {
  try {
    const raw = window.localStorage.getItem(CLAN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MyClanState) : null;
  } catch {
    return null;
  }
}

export function writeClanToStorage(clan: MyClanState | null) {
  if (clan) {
    window.localStorage.setItem(CLAN_STORAGE_KEY, JSON.stringify(clan));
  } else {
    window.localStorage.removeItem(CLAN_STORAGE_KEY);
  }
}
