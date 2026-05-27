"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type LogisticsSceneProps = {
  activeDeliveries: number;
  onlineAgents: number;
};

const routeColor = new THREE.Color("#e8a84a");
const secondaryRouteColor = new THREE.Color("#f0c878");

function browserSupportsWebGL() {
  const probe = document.createElement("canvas");
  return Boolean(probe.getContext("webgl2") || probe.getContext("webgl"));
}

function drawFallbackScene(
  canvas: HTMLCanvasElement,
  activeDeliveries: number,
  onlineAgents: number,
  prefersReducedMotion: boolean
) {
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return () => undefined;
  }

  let frame = 0;
  const startedAt = performance.now();
  const nodeCount = 6;
  const parcelCount = Math.min(10, Math.max(4, activeDeliveries + Math.ceil(onlineAgents / 10)));

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio, 1.7);
    canvas.width = Math.max(1, Math.floor(rect.width * pixelRatio));
    canvas.height = Math.max(1, Math.floor(rect.height * pixelRatio));
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const render = () => {
    const elapsed = (performance.now() - startedAt) / 1000;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const centerY = height * 0.42;
    const points = Array.from({ length: nodeCount }, (_, index) => {
      const progress = index / (nodeCount - 1);
      return {
        x: width * (0.11 + progress * 0.78),
        y: centerY + Math.sin(index * 1.4) * height * 0.055,
      };
    });

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#e0c8a0";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "#e8c898";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.48;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        const previous = points[index - 1];
        ctx.quadraticCurveTo(
          (previous.x + point.x) / 2,
          Math.min(previous.y, point.y) - 42,
          point.x,
          point.y
        );
      }
    });
    ctx.stroke();
    ctx.restore();

    points.forEach((point, index) => {
      ctx.save();
      ctx.fillStyle = index === 0 || index === points.length - 1 ? "#fff5e0" : "#f0e0c0";
      ctx.shadowColor = "#d8a860";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(point.x, point.y, index === 0 || index === points.length - 1 ? 5 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    for (let index = 0; index < parcelCount; index += 1) {
      const progress = prefersReducedMotion
        ? index / parcelCount
        : (elapsed * (0.035 + index * 0.002) + index / parcelCount) % 1;
      const scaled = progress * (points.length - 1);
      const currentIndex = Math.min(points.length - 2, Math.floor(scaled));
      const local = scaled - currentIndex;
      const from = points[currentIndex];
      const to = points[currentIndex + 1];
      const x = from.x + (to.x - from.x) * local;
      const y =
        from.y +
        (to.y - from.y) * local -
        Math.sin(local * Math.PI) * 42;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(elapsed + index) * 0.22);
      ctx.fillStyle = "#faf8f5";
      ctx.shadowColor = "#e0c8a0";
      ctx.shadowBlur = 14;
      ctx.fillRect(-4, -3, 8, 6);
      ctx.restore();
    }

    if (!prefersReducedMotion) {
      frame = requestAnimationFrame(render);
    }
  };

  resize();
  window.addEventListener("resize", resize);
  render();

  return () => {
    window.removeEventListener("resize", resize);
    cancelAnimationFrame(frame);
  };
}

export function LogisticsScene({ activeDeliveries, onlineAgents }: LogisticsSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (
      new URLSearchParams(window.location.search).has("fallbackScene") ||
      !browserSupportsWebGL()
    ) {
      return drawFallbackScene(
        canvas,
        activeDeliveries,
        onlineAgents,
        prefersReducedMotion
      );
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    let renderer: THREE.WebGLRenderer;
    const originalConsoleError = console.error;

    try {
      console.error = () => undefined;
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
      });
    } catch {
      console.error = originalConsoleError;
      return drawFallbackScene(
        canvas,
        activeDeliveries,
        onlineAgents,
        prefersReducedMotion
      );
    } finally {
      console.error = originalConsoleError;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const rig = new THREE.Group();
    scene.add(rig);

    const ambient = new THREE.AmbientLight(0xffffff, 0.38);
    scene.add(ambient);

    const keyLight = new THREE.PointLight(0xffe0a0, 5.2, 32);
    keyLight.position.set(-5, 7, 7);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0xffd0a0, 2.1, 28);
    fillLight.position.set(7, 4, -4);
    scene.add(fillLight);

    const grid = new THREE.GridHelper(36, 36, 0x6a5a4a, 0x4a3e32);
    const gridMaterial = grid.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.2;
    grid.position.y = -2;
    rig.add(grid);

    const nodePositions = [
      new THREE.Vector3(-9.6, -0.8, -1.8),
      new THREE.Vector3(-5.8, 0.25, 1.7),
      new THREE.Vector3(-1.4, -0.15, -0.9),
      new THREE.Vector3(2.7, 0.35, 1.6),
      new THREE.Vector3(6.4, -0.25, -1.2),
      new THREE.Vector3(9.4, 0.6, 1.4),
    ];

    const hubGeometry = new THREE.IcosahedronGeometry(0.22, 1);
    const hubMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff0d8,
      emissive: 0xe8a84a,
      emissiveIntensity: 0.58,
      metalness: 0.35,
      roughness: 0.32,
    });

    nodePositions.forEach((position, index) => {
      const hub = new THREE.Mesh(hubGeometry, hubMaterial);
      hub.position.copy(position);
      hub.scale.setScalar(index === 0 || index === nodePositions.length - 1 ? 1.35 : 1);
      rig.add(hub);
    });

    const curves = nodePositions.slice(0, -1).map((from, index) => {
      const to = nodePositions[index + 1];
      const midpoint = from
        .clone()
        .lerp(to, 0.5)
        .add(new THREE.Vector3(0, index % 2 === 0 ? 1.25 : 0.82, 0));
      return new THREE.CatmullRomCurve3([from, midpoint, to]);
    });

    const routeDisposables: Array<THREE.BufferGeometry | THREE.Material> = [];

    curves.forEach((curve, index) => {
      const routeGeometry = new THREE.BufferGeometry().setFromPoints(
        curve.getPoints(52)
      );
      const routeMaterial = new THREE.LineBasicMaterial({
        color: index % 2 === 0 ? routeColor : secondaryRouteColor,
        transparent: true,
        opacity: index % 2 === 0 ? 0.44 : 0.28,
      });
      routeDisposables.push(routeGeometry, routeMaterial);
      rig.add(new THREE.Line(routeGeometry, routeMaterial));
    });

    const packageGeometry = new THREE.BoxGeometry(0.34, 0.24, 0.34);
    const packageMaterial = new THREE.MeshStandardMaterial({
      color: 0xfaf8f5,
      emissive: 0xe8a84a,
      emissiveIntensity: 0.34,
      metalness: 0.12,
      roughness: 0.45,
    });
    const packageCount = Math.min(
      11,
      Math.max(5, activeDeliveries + Math.ceil(onlineAgents / 8))
    );
    const packages = Array.from({ length: packageCount }, (_, index) => {
      const packageMesh = new THREE.Mesh(packageGeometry, packageMaterial);
      packageMesh.userData = {
        curve: curves[index % curves.length],
        offset: index / packageCount,
        speed: 0.035 + (index % 4) * 0.009,
      };
      rig.add(packageMesh);
      return packageMesh;
    });

    const laneDotsGeometry = new THREE.BufferGeometry();
    const dotPositions: number[] = [];
    curves.forEach((curve) => {
      curve.getSpacedPoints(22).forEach((point) => {
        dotPositions.push(point.x, point.y, point.z);
      });
    });
    laneDotsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(dotPositions, 3)
    );
    const laneDots = new THREE.Points(
      laneDotsGeometry,
      new THREE.PointsMaterial({
        color: 0xf5deb8,
        opacity: 0.28,
        size: 0.045,
        transparent: true,
      })
    );
    rig.add(laneDots);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);

      camera.aspect = width / height;
      camera.position.set(0, 6.2, width < 700 ? 20 : 15.5);
      camera.lookAt(0, -0.35, 0);
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
      renderer.setSize(width, height, false);
    };

    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    const startedAt = performance.now();

    const render = () => {
      const elapsed = (performance.now() - startedAt) / 1000;

      rig.rotation.y = Math.sin(elapsed * 0.12) * 0.08;
      rig.rotation.x = -0.08 + Math.sin(elapsed * 0.09) * 0.015;

      packages.forEach((packageMesh, index) => {
        const curve = packageMesh.userData.curve as THREE.CatmullRomCurve3;
        const speed = packageMesh.userData.speed as number;
        const offset = packageMesh.userData.offset as number;
        const progress = prefersReducedMotion ? offset : (elapsed * speed + offset) % 1;
        const position = curve.getPointAt(progress);
        const tangent = curve.getTangentAt(progress);

        packageMesh.position.copy(position);
        packageMesh.rotation.y = Math.atan2(tangent.x, tangent.z);
        packageMesh.rotation.x = Math.sin(elapsed * 1.4 + index) * 0.08;
      });

      laneDots.rotation.y = prefersReducedMotion ? 0 : elapsed * 0.015;

      renderer.render(scene, camera);

      if (!prefersReducedMotion) {
        frame = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frame);
      renderer.dispose();
      grid.geometry.dispose();
      hubGeometry.dispose();
      packageGeometry.dispose();
      packageMaterial.dispose();
      hubMaterial.dispose();
      laneDotsGeometry.dispose();
      routeDisposables.forEach((disposable) => disposable.dispose());
      scene.clear();
    };
  }, [activeDeliveries, onlineAgents]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
