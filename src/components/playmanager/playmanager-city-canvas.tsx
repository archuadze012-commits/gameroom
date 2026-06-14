'use client';

import type * as Three from 'three';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export type PlayManagerCityBuilding = {
  label: string;
  spriteKey: string;
  spriteUrl?: string;
  anchorX: number;
  anchorY: number;
  scale: number;
  tone: 'green' | 'red' | 'gold';
};

type PlayManagerCityCanvasProps = {
  buildings: PlayManagerCityBuilding[];
  backgroundUrl?: string;
  hud?: ReactNode;
  onBuildingSelect?: (spriteKey: string) => void;
};

const TILE_COUNT = 20;
const TILE_SIZE = 1;
const WORLD_SIZE = TILE_COUNT * TILE_SIZE;
const CAMERA_VIEW_HEIGHT = 18.5;

const BUILDING_SIZES: Record<string, { width: number; height: number }> = {
  arena: { width: 4.5, height: 3.6 },
  market: { width: 2.45, height: 2.4 },
  academy: { width: 2.8, height: 2.55 },
  training: { width: 3.2, height: 2.65 },
  finance: { width: 2.35, height: 2.55 },
  league: { width: 2.15, height: 2.35 },
  media: { width: 2.05, height: 2.45 },
};

export function PlayManagerCityCanvas({ buildings, backgroundUrl, hud, onBuildingSelect }: PlayManagerCityCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const hoverLabelRef = useRef<HTMLDivElement>(null);
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    let loadingTimeout = 0;
    const loadingStartedAt = performance.now();

    async function mountThree() {
      const host = stageRef.current;
      if (!host) return;

      const THREE = await import('three');
      if (disposed || !stageRef.current) return;

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.className = 'pm-three-canvas';
      host.replaceChildren(renderer.domElement);

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x020806, 0.018);

      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 80);
      camera.position.set(12.5, 13.2, 12.5);
      camera.lookAt(0, 0, 0);

      const root = new THREE.Group();
      scene.add(root);

      addLights(THREE, scene);
      addEnvironment(THREE, root);
      const buildingSprites = await addBuildings(THREE, root, buildings);
      if (disposed) {
        renderer.dispose();
        return;
      }

      const elapsed = performance.now() - loadingStartedAt;
      const remaining = Math.max(0, 2000 - elapsed);
      loadingTimeout = window.setTimeout(() => {
        if (!disposed) {
          setShowLoading(false);
        }
      }, remaining);

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2(99, 99);
      let hovered: Three.Sprite | null = null;
      let lastWidth = 0;
      let lastHeight = 0;
      let animationFrame = 0;

      const resize = () => {
        const width = Math.max(1, Math.round(host.clientWidth));
        const height = Math.max(1, Math.round(host.clientHeight));
        if (width === lastWidth && height === lastHeight) return;

        lastWidth = width;
        lastHeight = height;

        const aspect = width / height;
        camera.left = -(CAMERA_VIEW_HEIGHT * aspect) / 2;
        camera.right = (CAMERA_VIEW_HEIGHT * aspect) / 2;
        camera.top = CAMERA_VIEW_HEIGHT / 2;
        camera.bottom = -CAMERA_VIEW_HEIGHT / 2;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };

      const updatePointer = (event: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      };

      const selectHovered = () => {
        const spriteKey = hovered?.userData.spriteKey;
        if (typeof spriteKey === 'string') {
          onBuildingSelect?.(spriteKey);
        }
      };

      const clearPointer = () => {
        pointer.set(99, 99);
        hovered = null;
        renderer.domElement.style.cursor = 'default';
      };

      const observer = new ResizeObserver(resize);
      observer.observe(host);
      resize();
      renderer.domElement.addEventListener('pointermove', updatePointer);
      renderer.domElement.addEventListener('pointerdown', selectHovered);
      renderer.domElement.addEventListener('pointerleave', clearPointer);

      const clock = new THREE.Clock();
      const animate = () => {
        if (disposed) return;

        const elapsed = clock.getElapsedTime();
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(buildingSprites, false)[0]?.object as Three.Sprite | undefined;
        hovered = hit ?? null;
        renderer.domElement.style.cursor = hovered ? 'pointer' : 'default';

        const hoverLabel = hoverLabelRef.current;
        if (hoverLabel) {
          if (hovered) {
            const projected = hovered.position.clone().project(camera);
            const x = (projected.x * 0.5 + 0.5) * lastWidth;
            const y = (-projected.y * 0.5 + 0.5) * lastHeight;
            hoverLabel.textContent = String(hovered.userData.label ?? '');
            hoverLabel.style.transform = `translate(${x}px, ${y - 18}px) translate(-50%, -100%)`;
            hoverLabel.dataset.visible = 'true';
          } else {
            hoverLabel.dataset.visible = 'false';
          }
        }

        buildingSprites.forEach((sprite) => {
          const baseScale = sprite.userData.baseScale as { x: number; y: number };
          const isHovered = sprite === hovered;
          const pulse = isHovered ? 1.04 + Math.sin(elapsed * 4.8) * 0.008 : 1;
          const scale = pulse;
          sprite.position.y = (sprite.userData.baseY as number) + (isHovered ? 0.025 : 0);
          sprite.scale.set(baseScale.x * scale, baseScale.y * scale, 1);
          (sprite.material as Three.SpriteMaterial).opacity = 1;
        });

        renderer.render(scene, camera);
        animationFrame = window.requestAnimationFrame(animate);
      };
      animate();

      cleanup = () => {
        observer.disconnect();
        renderer.domElement.removeEventListener('pointermove', updatePointer);
        renderer.domElement.removeEventListener('pointerdown', selectHovered);
        renderer.domElement.removeEventListener('pointerleave', clearPointer);
        window.cancelAnimationFrame(animationFrame);
        disposeObject(scene, THREE);
        renderer.dispose();
      };
    }

    void mountThree();

    return () => {
      disposed = true;
      window.clearTimeout(loadingTimeout);
      cleanup?.();
    };
  }, [buildings, onBuildingSelect]);

  return (
    <div
      className="pm-three-host"
      ref={hostRef}
    >
      <div
        className="pm-three-backdrop"
        style={backgroundUrl ? ({ ['--pm-three-bg-image' as string]: `url(${backgroundUrl})` } as CSSProperties) : undefined}
      />
      <div
        className={`pm-three-stage${showLoading ? ' pm-three-stage-hidden' : ''}`}
        ref={stageRef}
      />
      <div ref={hoverLabelRef} className="pm-building-hover-label" data-visible="false" />
      {!showLoading && hud ? <div className="pm-three-hud">{hud}</div> : null}
      {showLoading ? (
        <div className="pm-three-loading" aria-live="polite" aria-label="საფეხბურთო ქალაქი იტვირთება">
          <div className="pm-loading-orbit" aria-hidden="true">
            <span className="pm-loading-orbit-ring pm-loading-orbit-ring-a" />
            <span className="pm-loading-orbit-ring pm-loading-orbit-ring-b" />
          </div>
          <div className="pm-loading-card">
            <div className="pm-loading-stadium" aria-hidden="true">
              <span className="pm-loading-stand pm-loading-stand-top" />
              <span className="pm-loading-stand pm-loading-stand-right" />
              <span className="pm-loading-stand pm-loading-stand-bottom" />
              <span className="pm-loading-stand pm-loading-stand-left" />
              <span className="pm-loading-field">
                <span className="pm-loading-scan" />
                <span className="pm-loading-ball" />
              </span>
            </div>
            <div className="pm-loading-copy">
              <span className="pm-loading-kicker">PlayManager System</span>
              <p className="pm-loading-title">საფეხბურთო ქალაქი იტვირთება</p>
              <div className="pm-loading-progress" aria-hidden="true">
                <span />
              </div>
              <div className="pm-loading-status" aria-hidden="true">
                <span>არენა</span>
                <span>ფინანსები</span>
                <span>ლიგა</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function addLights(THREE: typeof import('three'), scene: import('three').Scene) {
  scene.add(new THREE.AmbientLight(0x91ffcf, 0.72));

  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(7, 14, 5);
  scene.add(key);

  const green = new THREE.PointLight(0x22c55e, 4.8, 24);
  green.position.set(-5, 4, 4);
  scene.add(green);

  const red = new THREE.PointLight(0x991b1b, 2.6, 20);
  red.position.set(7, 3, -7);
  scene.add(red);
}

function addEnvironment(THREE: typeof import('three'), root: import('three').Group) {
  const outerMaterial = new THREE.MeshBasicMaterial({
    color: 0x03150c,
    transparent: true,
    opacity: 0.06,
  });
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(38, 38), outerMaterial);
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = -0.045;
  outer.renderOrder = 0;
  root.add(outer);

  for (let index = 0; index < 34; index += 1) {
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 8),
      new THREE.MeshBasicMaterial({ color: index % 4 === 0 ? 0x991b1b : 0x6ee7b7 }),
    );
    const side = index % 4;
    const t = -9.5 + (index % 9) * 2.35;
    light.position.set(
      side < 2 ? t : side === 2 ? -11.2 : 11.2,
      0.12,
      side < 2 ? (side === 0 ? -11.2 : 11.2) : t,
    );
    root.add(light);
  }
}

async function addBuildings(
  THREE: typeof import('three'),
  root: import('three').Group,
  buildings: PlayManagerCityBuilding[],
) {
  const loader = new THREE.TextureLoader();
  const sprites: import('three').Sprite[] = [];

  for (const building of buildings) {
    const sprite = await createBuildingSprite(THREE, loader, building);
    const position = anchorToWorld(building.anchorX, building.anchorY);
    sprite.position.set(position.x, 0.006, position.z);
    sprite.renderOrder = 100 + Math.round(building.anchorY * 100);
    sprite.userData.baseY = sprite.position.y;
    root.add(sprite);
    sprites.push(sprite);

    const plaza = createBuildingPlaza(THREE, building);
    plaza.position.set(position.x, 0.004, position.z);
    root.add(plaza);
  }

  return sprites;
}

async function createBuildingSprite(
  THREE: typeof import('three'),
  loader: import('three').TextureLoader,
  building: PlayManagerCityBuilding,
) {
  const texture = building.spriteUrl
    ? await loader.loadAsync(building.spriteUrl)
    : createFallbackTexture(THREE, building.tone);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.035,
    depthTest: true,
    depthWrite: false,
    opacity: 1,
  });
  const sprite = new THREE.Sprite(material);
  const dimensions = BUILDING_SIZES[building.spriteKey] ?? { width: 2.4, height: 2.4 };
  const width = dimensions.width * building.scale;
  const height = dimensions.height * building.scale;
  sprite.center.set(0.5, 0.005);
  sprite.scale.set(width, height, 1);
  sprite.userData.baseScale = { x: width, y: height };
  sprite.userData.label = building.label;
  sprite.userData.spriteKey = building.spriteKey;
  return sprite;
}

function createBuildingPlaza(THREE: typeof import('three'), building: PlayManagerCityBuilding) {
  const color = building.tone === 'red' ? 0x991b1b : building.tone === 'gold' ? 0xeab308 : 0x22c55e;
  const size = building.spriteKey === 'arena' ? 3.8 : building.spriteKey === 'training' ? 2.7 : 2.1;
  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(size * building.scale, size * 0.72 * building.scale),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.renderOrder = 8;
  return plaza;
}

function anchorToWorld(anchorX: number, anchorY: number) {
  return {
    x: (anchorX - 0.5) * WORLD_SIZE,
    z: (anchorY - 0.5) * WORLD_SIZE,
  };
}

function createFallbackTexture(THREE: typeof import('three'), tone: PlayManagerCityBuilding['tone']) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  const fill = tone === 'red' ? '#7f1d1d' : tone === 'gold' ? '#a16207' : '#047857';
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(72, 72, 112, 132, 18);
  ctx.fill();
  ctx.fillStyle = '#6ee7b7';
  ctx.beginPath();
  ctx.moveTo(56, 86);
  ctx.lineTo(128, 34);
  ctx.lineTo(200, 86);
  ctx.closePath();
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function disposeObject(object: import('three').Object3D, THREE: typeof import('three')) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Sprite || child instanceof THREE.LineSegments || child instanceof THREE.Line) {
      const mesh = child as import('three').Mesh | import('three').Sprite | import('three').Line;
      const material = mesh.material;
      const materials = Array.isArray(material) ? material : [material];
      materials.forEach((entry) => {
        const maybeTexture = (entry as { map?: import('three').Texture }).map;
        maybeTexture?.dispose();
        entry.dispose();
      });
      mesh.geometry?.dispose();
    }
  });
}
