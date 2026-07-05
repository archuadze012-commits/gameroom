"use client";

import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { getCroppedImg, type Area } from "@/lib/crop-image";
import { ZoomIn, ZoomOut, Check, X } from "lucide-react";
import { useHydrated } from "@/lib/use-hydrated";

type Props = {
  imageSrc: string;
  aspect: number;
  shape?: "rect" | "round";
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
};

export function ImageCropModal({ imageSrc, aspect, shape = "rect", onConfirm, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const mounted = useHydrated();

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    const result = await getCroppedImg(imageSrc, croppedAreaPixels);
    onConfirm(result);
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">ფოტოს მორგება</h2>
          <button onClick={onCancel} className="rounded-md p-1 hover:bg-secondary/60">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Crop area */}
        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={shape}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
            className="rounded-md p-1 hover:bg-secondary/60"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
            className="rounded-md p-1 hover:bg-secondary/60"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <span className="w-10 text-right text-xs text-muted-foreground">
            {zoom.toFixed(1)}x
          </span>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          გადაათრიე და zoom-ი შეუცვალე სასურველ ადგილამდე
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="mr-1 h-4 w-4" /> გაუქმება
          </Button>
          <Button onClick={handleConfirm}>
            <Check className="mr-1 h-4 w-4" /> დადასტურება
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
