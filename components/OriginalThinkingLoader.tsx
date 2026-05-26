"use client";

import { useEffect, useId, useMemo, useRef } from "react";

const config = {
  particleCount: 64,
  trailSpan: 0.38,
  durationMs: 4600,
  rotationDurationMs: 28000,
  pulseDurationMs: 4200,
  strokeWidth: 5.5,
  baseRadius: 7,
  detailAmplitude: 3,
  petalCount: 7,
  curveScale: 3.9,
};

function normalizeProgress(progress: number) {
  return ((progress % 1) + 1) % 1;
}

function getDetailScale(time: number) {
  const pulseProgress = (time % config.pulseDurationMs) / config.pulseDurationMs;
  const pulseAngle = pulseProgress * Math.PI * 2;
  return 0.52 + ((Math.sin(pulseAngle + 0.55) + 1) / 2) * 0.48;
}

function getRotation(time: number) {
  return -((time % config.rotationDurationMs) / config.rotationDurationMs) * 360;
}

function point(progress: number, detailScale: number) {
  const t = progress * Math.PI * 2;
  const petals = Math.round(config.petalCount);
  const x =
    config.baseRadius * Math.cos(t) -
    config.detailAmplitude * detailScale * Math.cos(petals * t);
  const y =
    config.baseRadius * Math.sin(t) -
    config.detailAmplitude * detailScale * Math.sin(petals * t);

  return {
    x: 50 + x * config.curveScale,
    y: 50 + y * config.curveScale,
  };
}

function buildPath(detailScale: number, steps = 360) {
  const commands: string[] = [];

  for (let index = 0; index <= steps; index += 1) {
    const nextPoint = point(index / steps, detailScale);
    commands.push(
      `${index === 0 ? "M" : "L"} ${nextPoint.x.toFixed(2)} ${nextPoint.y.toFixed(2)}`
    );
  }

  return commands.join(" ");
}

function getParticle(index: number, progress: number, detailScale: number) {
  const tailOffset = index / (config.particleCount - 1);
  const particlePoint = point(
    normalizeProgress(progress - tailOffset * config.trailSpan),
    detailScale
  );
  const fade = Math.pow(1 - tailOffset, 0.56);

  return {
    x: particlePoint.x,
    y: particlePoint.y,
    radius: 0.9 + fade * 2.7,
    opacity: 0.04 + fade * 0.96,
  };
}

type OriginalThinkingLoaderProps = {
  isVisible: boolean;
};

export function OriginalThinkingLoader({ isVisible }: OriginalThinkingLoaderProps) {
  const rawId = useId();
  const gradientId = `original-thinking-${rawId.replaceAll(":", "")}`;
  const groupRef = useRef<SVGGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const particleRefs = useRef<SVGCircleElement[]>([]);
  const particleIndexes = useMemo(
    () => Array.from({ length: config.particleCount }, (_, index) => index),
    []
  );

  useEffect(() => {
    const group = groupRef.current;
    const path = pathRef.current;

    if (!group || !path) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      const detailScale = getDetailScale(0);
      group.setAttribute("transform", "rotate(-14 50 50)");
      path.setAttribute("d", buildPath(detailScale));
      particleRefs.current.forEach((node, index) => {
        const particle = getParticle(index, 0.2, detailScale);
        node.setAttribute("cx", particle.x.toFixed(2));
        node.setAttribute("cy", particle.y.toFixed(2));
        node.setAttribute("r", particle.radius.toFixed(2));
        node.setAttribute("opacity", particle.opacity.toFixed(3));
      });
      return;
    }

    let frame = 0;
    const startedAt = performance.now();

    const render = (now: number) => {
      const time = now - startedAt;
      const progress = (time % config.durationMs) / config.durationMs;
      const detailScale = getDetailScale(time);

      group.setAttribute("transform", `rotate(${getRotation(time)} 50 50)`);
      path.setAttribute("d", buildPath(detailScale));

      particleRefs.current.forEach((node, index) => {
        const particle = getParticle(index, progress, detailScale);
        node.setAttribute("cx", particle.x.toFixed(2));
        node.setAttribute("cy", particle.y.toFixed(2));
        node.setAttribute("r", particle.radius.toFixed(2));
        node.setAttribute("opacity", particle.opacity.toFixed(3));
      });

      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-slate-950 transition-[opacity,filter] duration-700 ease-out ${
        isVisible ? "opacity-100 blur-0" : "pointer-events-none opacity-0 blur-sm"
      }`}
      role="status"
      aria-live="polite"
      aria-label="Loading LogiTrack"
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,9,7,0.94),rgba(8,9,7,1))]" />

      <div className="relative grid justify-items-center gap-5 px-6 text-center">
        <div className="relative grid size-44 place-items-center sm:size-52">
          <div className="absolute inset-5 rounded-full border border-white/10 bg-white/[0.02] shadow-[inset_0_0_48px_rgba(255,255,255,0.04)]" />
          <svg
            viewBox="0 0 100 100"
            fill="none"
            aria-hidden="true"
            className="relative size-full overflow-visible"
          >
            <defs>
              <linearGradient id={gradientId} x1="22" y1="12" x2="80" y2="88">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="48%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
            <g ref={groupRef}>
              <path
                ref={pathRef}
                stroke={`url(#${gradientId})`}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={config.strokeWidth}
                opacity="0.16"
              />
              {particleIndexes.map((index) => (
                <circle
                  key={index}
                  ref={(node) => {
                    if (node) {
                      particleRefs.current[index] = node;
                    }
                  }}
                  fill={`url(#${gradientId})`}
                />
              ))}
            </g>
          </svg>
        </div>

        <div className="grid gap-2">
          <p className="text-sm font-black text-white">LogiTrack</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-100/[0.45]">
            Preparing control room
          </p>
        </div>
      </div>

      <span className="sr-only">Loading LogiTrack</span>
    </div>
  );
}
