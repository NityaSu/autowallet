"use client";

import { useId } from "react";

/** Soft brand wash — sits with `--color-brand` (#fc6203) on light UI. */
const BRAND = "#fc6203";
const BRAND_SOFT = "#ff8a4a";

const CLOUD_PATH =
  "M12 20C5.373 20 0 15.523 0 10C0 4.477 5.373 0 12 0C14.5 0 16.8 0.7 18.7 2C20.5 0.8 22.7 0 25 0C31.627 0 37 4.477 37 10C37 10.5 36.95 11 36.85 11.5C39.6 12.8 41.5 15.5 41.5 18.5C41.5 23.2 37.8 27 33 27H12C5.373 27 0 22.627 0 17C0 14.5 1 12.2 2.8 10.5";

const VB_W = 42;
const VB_H = 28;
const VB_PAD = 2;

export function CloudMark({
  width = 34,
  height = 22,
  className,
  invert = false,
  decorative = false,
}: {
  width?: number;
  height?: number;
  className?: string;
  invert?: boolean;
  decorative?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const fillId = `aw-cloud-fill-${uid}`;
  const hiId = `aw-cloud-hi-${uid}`;
  const fill = invert ? "rgba(255,255,255,0.18)" : `url(#${fillId})`;
  const stroke = invert ? "rgba(255,255,255,0.95)" : BRAND;
  const dotA = invert ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.92)";
  const dotB = invert ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.7)";
  const displayWidth = width * ((VB_W + VB_PAD * 2) / VB_W);
  const displayHeight = height * ((VB_H + VB_PAD * 2) / VB_H);

  return (
    <svg
      width={displayWidth}
      height={displayHeight}
      viewBox={`${-VB_PAD} ${-VB_PAD} ${VB_W + VB_PAD * 2} ${VB_H + VB_PAD * 2}`}
      fill="none"
      overflow="visible"
      xmlns="http://www.w3.org/2000/svg"
      className={["overflow-visible shrink-0", className]
        .filter(Boolean)
        .join(" ")}
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "AutoWallet"}
    >
      {invert ? null : (
        <defs>
          <linearGradient
            id={fillId}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor={BRAND_SOFT} />
            <stop offset="55%" stopColor={BRAND} />
            <stop offset="100%" stopColor={BRAND} />
          </linearGradient>
          <radialGradient id={hiId} cx="20%" cy="20%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
      )}
      <path
        d={CLOUD_PATH}
        fill={fill}
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {invert ? null : <path d={CLOUD_PATH} fill={`url(#${hiId})`} />}
      <circle cx="14" cy="8" r="2.2" fill={dotA} />
      <circle cx="22" cy="6" r="1.6" fill={dotB} />
    </svg>
  );
}
