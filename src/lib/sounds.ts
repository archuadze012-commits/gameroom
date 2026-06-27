type SoundPath = "/sounds/invite.wav" | "/sounds/message.mp3" | "/sounds/announcement.mp3";

function playSound(path: SoundPath, volume: number) {
  try {
    const audio = new Audio(path);
    audio.preload = "auto";
    audio.volume = volume;
    void audio.play().catch(() => {});
  } catch {}
}

export function playInviteSound() {
  playSound("/sounds/invite.wav", 0.55);
}

export function playPlayManagerMessageSound() {
  playSound("/sounds/message.mp3", 0.4);
}

export function playPlayManagerAnnouncementSound() {
  playSound("/sounds/announcement.mp3", 0.48);
}
