export type UserRole = "user" | "moderator" | "organizer" | "streamer" | "esports" | "admin";

export type PublicProfile = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  region: string | null;
  voiceChat: boolean;
  bio: string | null;
};

export type AdminUserRow = PublicProfile & {
  id: string;
  email: string | null;
  banned: boolean;
  banReason: string | null;
  createdAt: string;
};
