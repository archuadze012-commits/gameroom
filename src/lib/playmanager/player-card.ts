export type PlayManagerPlayerCardLayout = {
  silWidth?: number;
  silHeight?: number;
  silX?: number;
  silY?: number;
  silOpacity?: number;
  contentY?: number;
  nameSize?: number;
  statsScale?: number;
};

type PlayManagerPlayerCardSource = {
  card_sil_width?: number | null;
  card_sil_height?: number | null;
  card_sil_x?: number | null;
  card_sil_y?: number | null;
  card_sil_opacity?: number | null;
  card_content_y?: number | null;
  card_name_size?: number | null;
  card_stats_scale?: number | null;
};

export function buildPlayManagerPlayerCardLayout(
  source: PlayManagerPlayerCardSource,
): PlayManagerPlayerCardLayout | undefined {
  const layout: PlayManagerPlayerCardLayout = {};

  if (source.card_sil_width !== null && source.card_sil_width !== undefined) layout.silWidth = source.card_sil_width;
  if (source.card_sil_height !== null && source.card_sil_height !== undefined) layout.silHeight = source.card_sil_height;
  if (source.card_sil_x !== null && source.card_sil_x !== undefined) layout.silX = source.card_sil_x;
  if (source.card_sil_y !== null && source.card_sil_y !== undefined) layout.silY = source.card_sil_y;
  if (source.card_sil_opacity !== null && source.card_sil_opacity !== undefined) layout.silOpacity = source.card_sil_opacity;
  if (source.card_content_y !== null && source.card_content_y !== undefined) layout.contentY = source.card_content_y;
  if (source.card_name_size !== null && source.card_name_size !== undefined) layout.nameSize = source.card_name_size;
  if (source.card_stats_scale !== null && source.card_stats_scale !== undefined) layout.statsScale = source.card_stats_scale;

  return Object.keys(layout).length > 0 ? layout : undefined;
}
