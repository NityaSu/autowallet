"use client";

import { useState } from "react";
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

export function CopyHandle({
  handle,
  className,
}: {
  handle: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    if (!handle) return;
    try {
      await writeClipboard(handle);
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
      disabled={!handle}
      onClick={() => void onCopy()}
    >
      {copied ? "Copied" : handle ? `Copy ${handle}` : "Copy handle"}
    </button>
  );
}
