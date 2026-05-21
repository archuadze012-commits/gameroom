export type Area = { x: number; y: number; width: number; height: number };

// Minimum output dimension to guarantee sharp avatars/banners.
// If the user's crop selection is smaller than this, we upscale via canvas
// (which won't add detail but ensures consistent storage quality and avoids
// the player card blowing up tiny crops to ~340px wide).
const MIN_OUTPUT_DIM = 1024;

export async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await loadImage(imageSrc);
  const aspect = pixelCrop.width / pixelCrop.height;
  let outW = pixelCrop.width;
  let outH = pixelCrop.height;
  if (Math.min(outW, outH) < MIN_OUTPUT_DIM) {
    if (outW < outH) {
      outW = MIN_OUTPUT_DIM;
      outH = Math.round(outW / aspect);
    } else {
      outH = MIN_OUTPUT_DIM;
      outW = Math.round(outH * aspect);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0,
    outW, outH,
  );
  return canvas.toDataURL("image/jpeg", 0.95);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
