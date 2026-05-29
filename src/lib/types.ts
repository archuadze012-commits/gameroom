export type UserRole = "user" | "moderator" | "organizer" | "streamer" | "esports" | "admin" | "journalist";

export type PublicProfile = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  isVerified: boolean;
  role: UserRole;
  region: string | null;
  voiceChat: boolean;
  bio: string | null;
  isOnline: boolean;
  favoriteGameSlugs: string[];
  followerCount: number;
};

export type AdminUserRow = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  email: string | null;
  banned: boolean;
  banReason: string | null;
  banExpiresAt: string | null;
  isVerified: boolean;
  createdAt: string;
};
