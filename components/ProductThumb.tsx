"use client";

import React, { useState } from "react";

interface ProductThumbProps {
  src: string;
  name: string;
  size?: number;
  className?: string;
}

// Deterministic warm/neutral tint per product so the fallback never strobes
// between renders. Stays inside the locked Workbench palette: muted surface
// + ink text, no random colour wheel.
function tintForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  }
  const hues = [40, 30, 20, 55, 200, 160, 280];
  const h = hues[hash % hues.length];
  return `oklch(22% 0.02 ${h})`;
}

export function ProductThumb({ src, name, size = 48, className = "" }: ProductThumbProps) {
  const [errored, setErrored] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "·";
  const dimension = { width: size, height: size };

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border ${className}`}
      style={{ ...dimension, backgroundColor: tintForName(name) }}
      aria-hidden={false}
    >
      <span
        className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold text-foreground/80"
        aria-hidden="true"
      >
        {initial}
      </span>
      {!errored ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          onError={() => setErrored(true)}
          className="relative h-full w-full object-cover"
        />
      ) : null}
    </span>
  );
}
