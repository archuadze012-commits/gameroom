'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const cityAsset = '/playmanager/models/city_environment.glb';
const TARGET_SPAN = 4.6;

export function PlayManagerWebglCity() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const lowPowerMode = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
    const targetFps = lowPowerMode ? 30 : 45;
    const frameInterval = 1000 / targetFps;
    const renderer = new THREE.WebGLRenderer({
      antialias: !lowPowerMode,
      alpha: true,
      powerPreference: lowPowerMode ? 'low-power' : 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPowerMode ? 1.15 : 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x07100c, 1);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06100d, 0.028);

    const camera = new THREE.PerspectiveCamera(28, mount.clientWidth / mount.clientHeight, 0.1, 120);
    camera.position.set(3.6, 4.4, 4.8);
    camera.lookAt(0, 0, 0);

    const hemi = new THREE.HemisphereLight(0xd8fff1, 0x07100c, 2.2);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffe0a6, 3.4);
    keyLight.position.set(-5, 9, 6);
    scene.add(keyLight);

    const city = new THREE.Group();
    scene.add(city);

    const target = new THREE.Vector3(0, 0.35, 0);
    const targetCamera = camera.position.clone();
    let isDragging = false;
    let previousX = 0;
    let yaw = Math.atan2(camera.position.x, camera.position.z);
    let radius = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
    let animationFrame = 0;
    let lastFrameTime = 0;
    let sceneVisible = true;
    let pageVisible = document.visibilityState === 'visible';

    const frameCity = () => {
      const box = new THREE.Box3().setFromObject(city);
      if (box.isEmpty()) return;

      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const horizontalSpan = Math.max(size.x, size.z);
      const nextRadius = THREE.MathUtils.clamp(horizontalSpan * 0.78, 2.4, 5.5);
      const nextHeight = THREE.MathUtils.clamp(size.y * 2.0 + 1.4, 2.2, 4.8);

      target.copy(center);
      radius = nextRadius;
      targetCamera.set(center.x + Math.sin(yaw) * nextRadius, center.y + nextHeight, center.z + Math.cos(yaw) * nextRadius);
      camera.position.copy(targetCamera);
      camera.lookAt(target);
    };

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      cityAsset,
      (gltf) => {
        const model = gltf.scene;
        model.name = 'playmanager_football_city';

        // Normalize: scale to a consistent span and recenter on origin.
        const rawBox = new THREE.Box3().setFromObject(model);
        const rawSpan = Math.max(rawBox.max.x - rawBox.min.x, rawBox.max.z - rawBox.min.z);
        const fitScale = rawSpan > 0 ? TARGET_SPAN / rawSpan : 1;
        model.scale.setScalar(fitScale);
        model.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= box.min.y;
        model.updateMatrixWorld(true);

        model.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          if (child.name === 'Sphere') { child.visible = false; return; }
          child.frustumCulled = true;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          for (const material of materials) {
            if (!(material instanceof THREE.MeshStandardMaterial)) continue;
            material.side = THREE.FrontSide;
            material.emissiveIntensity = lowPowerMode ? 0.8 : 1;
            material.needsUpdate = true;
          }
        });

        city.add(model);
        frameCity();
      },
      undefined,
      (error) => {
        console.error('football city failed to load', error);
      }
    );

    const handlePointerMove = (event: PointerEvent) => {
      if (isDragging) {
        const delta = event.clientX - previousX;
        previousX = event.clientX;
        yaw -= delta * 0.007;
        targetCamera.set(Math.sin(yaw) * radius, camera.position.y, Math.cos(yaw) * radius);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      isDragging = true;
      previousX = event.clientX;
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = 'grabbing';
    };

    const handlePointerUp = (event: PointerEvent) => {
      isDragging = false;
      renderer.domElement.releasePointerCapture(event.pointerId);
      renderer.domElement.style.cursor = 'grab';
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      radius = THREE.MathUtils.clamp(radius + event.deltaY * 0.004, 2.4, 5.5);
      targetCamera.set(Math.sin(yaw) * radius, THREE.MathUtils.clamp(camera.position.y + event.deltaY * 0.0015, 2.2, 4.8), Math.cos(yaw) * radius);
    };

    const handleResize = () => {
      if (!mount.isConnected) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    const handleContextLost = (event: Event) => {
      event.preventDefault();
    };

    const handleVisibilityChange = () => {
      pageVisible = document.visibilityState === 'visible';
    };

    const observer = new IntersectionObserver(([entry]) => {
      sceneVisible = entry?.isIntersecting ?? true;
    });
    observer.observe(mount);

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const animate = (time = 0) => {
      animationFrame = requestAnimationFrame(animate);
      if (!pageVisible || !sceneVisible || time - lastFrameTime < frameInterval) return;
      lastFrameTime = time;

      const elapsed = time * 0.001;
      city.rotation.y = Math.sin(elapsed * 0.18) * 0.012;
      camera.position.lerp(targetCamera, 0.045);
      camera.lookAt(target);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observer.disconnect();
      dracoLoader.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const material = object.material;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material.dispose();
      });
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-emerald-300/24 bg-black/46 px-3 py-2 text-[10px] font-black text-emerald-100 backdrop-blur-xl sm:left-6 sm:top-6 sm:text-[11px]">
        გადაატრიალე / zoom
      </div>
    </div>
  );
}
