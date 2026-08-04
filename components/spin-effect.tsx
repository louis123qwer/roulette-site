"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DragonCrest } from "@/components/dragon-crest";

export type EffectTier = "legendary" | "gold" | "purple" | "blue" | "basic";

export const TIER_RANK: Record<EffectTier, number> = {
  legendary: 4,
  gold: 3,
  purple: 2,
  blue: 1,
  basic: 0,
};

export const TIER_GLOW: Record<EffectTier, string> = {
  legendary: "#f5c56a",
  gold: "#e0b34d",
  purple: "#a879e0",
  blue: "#5ab8e0",
  basic: "",
};

const TIER_STYLE: Record<
  Exclude<EffectTier, "basic">,
  {
    glow: string;
    ring: string;
    orbiters: number;
    dragons: number;
    particles: number;
    particleColor: string;
    speed: number;
    lightning: boolean;
  }
> = {
  legendary: {
    glow: "#f5c56a",
    ring: "#f5c56a",
    orbiters: 8,
    dragons: 3,
    particles: 30,
    particleColor: "#ff7a3d",
    speed: 3,
    lightning: false,
  },
  gold: {
    glow: "#e0b34d",
    ring: "#e0c04a",
    orbiters: 6,
    dragons: 1,
    particles: 16,
    particleColor: "#f0c04a",
    speed: 4,
    lightning: false,
  },
  purple: {
    glow: "#a879e0",
    ring: "#b98af0",
    orbiters: 4,
    dragons: 0,
    particles: 8,
    particleColor: "#c79cf5",
    speed: 5,
    lightning: false,
  },
  blue: {
    glow: "#5ab8e0",
    ring: "#7cd4f5",
    orbiters: 3,
    dragons: 0,
    particles: 6,
    particleColor: "#9fe4ff",
    speed: 2.2,
    lightning: true,
  },
};

function RuneGlyph({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 20 20" className="h-full w-full">
      <path d="M10 1 L13 8 L19 10 L13 12 L10 19 L7 12 L1 10 L7 8 Z" fill={color} />
    </svg>
  );
}

function BoltGlyph({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 20 20" className="h-full w-full">
      <path d="M11 0 L3 12 L9 12 L8 20 L17 8 L11 8 Z" fill={color} />
    </svg>
  );
}

export function SpinEffect({ tier, active }: { tier: EffectTier; active: boolean }) {
  const cfg = tier === "basic" ? null : TIER_STYLE[tier];

  const orbiters = useMemo(() => {
    if (!cfg) return [];
    return Array.from({ length: cfg.orbiters }, (_, i) => ({
      angle: (360 / cfg.orbiters) * i,
      isDragon: i < cfg.dragons,
      size: tier === "legendary" ? 22 : 16,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  const [particles, setParticles] = useState<
    { angle: number; distance: number; delay: number; size: number }[]
  >([]);

  useEffect(() => {
    if (!cfg || !active) return;
    const next = Array.from({ length: cfg.particles }, () => ({
      angle: Math.random() * 360,
      distance: 55 + Math.random() * 95,
      delay: Math.random() * 0.35,
      size: 3 + Math.random() * 5,
    }));
    startTransition(() => setParticles(next));
    // Re-roll a fresh burst every time this becomes active.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, tier]);

  if (!cfg) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      <motion.div
        className="absolute inset-[6%] rounded-full blur-2xl"
        style={{ backgroundColor: cfg.glow }}
        animate={{
          opacity: active ? [0.15, 0.4, 0.15] : 0.08,
          scale: active ? [1, 1.06, 1] : 1,
        }}
        transition={{ duration: 1.8, repeat: active ? Infinity : 0, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: cfg.speed, repeat: Infinity, ease: "linear" }}
      >
        {orbiters.map((o, i) => {
          const rad = (o.angle * Math.PI) / 180;
          const radiusPct = 48;
          const left = 50 + radiusPct * Math.cos(rad);
          const top = 50 + radiusPct * Math.sin(rad);
          return (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: o.size,
                height: o.size,
                transform: "translate(-50%, -50%)",
                opacity: 0.85,
              }}
            >
              {o.isDragon ? (
                <DragonCrest className="h-full w-full" style={{ color: cfg.ring }} />
              ) : cfg.lightning ? (
                <BoltGlyph color={cfg.ring} />
              ) : (
                <RuneGlyph color={cfg.ring} />
              )}
            </div>
          );
        })}
      </motion.div>

      <AnimatePresence>
        {active &&
          particles.map((p, i) => (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 rounded-full"
              style={{ width: p.size, height: p.size, backgroundColor: cfg.particleColor }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{
                x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
                y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
                opacity: 0,
              }}
              transition={{ duration: 1.1, delay: p.delay, ease: "easeOut" }}
            />
          ))}
      </AnimatePresence>
    </div>
  );
}
