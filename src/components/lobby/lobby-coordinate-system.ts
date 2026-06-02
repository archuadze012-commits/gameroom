export const LOBBY_SCENE_WIDTH = 1920;
export const LOBBY_SCENE_HEIGHT = 1080;

const PREVIOUS_STAGE_WIDTH = 654;
const PREVIOUS_STAGE_HEIGHT = 327;

export const LOBBY_UI_SCALE = LOBBY_SCENE_WIDTH / PREVIOUS_STAGE_WIDTH;

export function lobbyX(value: number) {
  return value * (LOBBY_SCENE_WIDTH / PREVIOUS_STAGE_WIDTH);
}

export function lobbyY(value: number) {
  return value * (LOBBY_SCENE_HEIGHT / PREVIOUS_STAGE_HEIGHT);
}
