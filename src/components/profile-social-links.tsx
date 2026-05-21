"use client";


const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
  </svg>
);

const SteamIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0Zm-4.523 18.166-2.062-.852a2.557 2.557 0 0 0 1.331 1.323 2.561 2.561 0 0 0 3.355-1.359 2.546 2.546 0 0 0 .002-1.953 2.54 2.54 0 0 0-1.36-1.347 2.554 2.554 0 0 0-1.876-.011l2.132.881a1.886 1.886 0 1 1-1.522 3.318zm12.488-6.247c0 1.677-1.366 3.04-3.043 3.04A3.044 3.044 0 0 1 13.86 11.92a3.04 3.04 0 0 1 3.04-3.039c1.678 0 3.044 1.363 3.044 3.038zM15.398 11.918a2.282 2.282 0 0 0 4.561.001 2.281 2.281 0 1 0-4.561-.001Z" />
  </svg>
);

type SteamAccount = {
  external_id: string;
  data: {
    personaName?: string;
    profileUrl?: string;
    gameCount?: number;
  } | null;
};

type Props = {
  defaultYtHandle: string;
  defaultTtHandle: string;
  isOwner: boolean;
  userId?: string;
  steam?: SteamAccount | null;
};

export function ProfileSocialLinks({
  defaultYtHandle,
  defaultTtHandle,
  steam,
}: Props) {
  const ytHandle = defaultYtHandle;
  const ttHandle = defaultTtHandle;

  const hasAny = !!steam || !!ytHandle || !!ttHandle;
  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {steam && (
        <a
          href={steam.data?.profileUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          title={`Steam — ${steam.data?.personaName ?? steam.external_id}${steam.data?.gameCount ? ` · ${steam.data.gameCount} თამაში` : ""}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-blue-500/10 text-blue-400 transition-all hover:border-blue-500/60 hover:bg-blue-500/20"
        >
          <SteamIcon />
        </a>
      )}
      {ytHandle && (
        <a
          href={`https://youtube.com/@${ytHandle.replace(/^@/, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          title={`YouTube — @${ytHandle.replace(/^@/, "")}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-red-500/10 text-red-500 transition-all hover:border-red-500/60 hover:bg-red-500/20"
        >
          <YoutubeIcon />
        </a>
      )}
      {ttHandle && (
        <a
          href={`https://tiktok.com/@${ttHandle.replace(/^@/, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          title={`TikTok — @${ttHandle.replace(/^@/, "")}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-pink-500/10 text-pink-500 transition-all hover:border-pink-500/60 hover:bg-pink-500/20"
        >
          <TikTokIcon />
        </a>
      )}
    </div>
  );
}
