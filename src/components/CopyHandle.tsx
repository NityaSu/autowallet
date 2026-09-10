"use client";

import { useState } from "react";
import { completeHandle, HANDLE_RE } from "@/lib/ledger-types";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

async function writeClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  el.remove();
}

function CopyText({
  label,
  className,
  disabled,
  getText,
}: {
  label: string;
  className?: string;
  disabled?: boolean;
  getText: () => string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    const text = getText();
    if (!text) return;
    try {
      await writeClipboard(text);
    } catch {
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      className={cx(tw.btn, className)}
      disabled={disabled}
      onClick={() => void onCopy()}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

export function payLinkFor(handle: string, origin = "") {
  const path = `/send?to=${encodeURIComponent(handle)}`;
  return origin ? `${origin}${path}` : path;
}

export function handleFromPayQr(raw: string, origin = "") {
  const text = raw.trim();
  if (!text) return null;

  try {
    const url = new URL(text, origin || "https://local.invalid");
    const to = url.searchParams.get("to")?.trim() ?? "";
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (to && path.endsWith("/send")) {
      const handle = completeHandle(to);
      return HANDLE_RE.test(handle) ? handle : null;
    }
  } catch {
    // Not a URL — maybe a bare handle.
  }

  const handle = completeHandle(text);
  return HANDLE_RE.test(handle) ? handle : null;
}

export function CopyHandle({
  handle,
  className,
}: {
  handle: string;
  className?: string;
}) {
  return (
    <CopyText
      className={className}
      disabled={!handle}
      label={handle ? `Copy ${handle}` : "Copy handle"}
      getText={() => handle}
    />
  );
}

export function CopyPayLink({
  handle,
  className,
}: {
  handle: string;
  className?: string;
}) {
  return (
    <CopyText
      className={className}
      disabled={!handle}
      label="Copy pay link"
      getText={() =>
        payLinkFor(handle, typeof window !== "undefined" ? window.location.origin : "")
      }
    />
  );
}
