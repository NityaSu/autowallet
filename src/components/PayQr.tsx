"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { payLinkFor } from "@/components/CopyHandle";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

export function PayQr({ handle }: { handle: string }) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!handle || !origin) return null;

  const url = payLinkFor(handle, origin);

  return (
    <article className={cx(tw.card, "mt-3.5")}>
      <span className={tw.kicker}>Scan to pay</span>
      <div className="mt-3 flex items-center gap-4">
        <div className="rounded-xl bg-white p-2">
          <QRCodeSVG value={url} size={128} marginSize={1} level="M" />
        </div>
        <p className={cx(tw.muted, "m-0 max-w-[16rem] text-sm")}>
          Opens Send as {handle}. They still confirm the name before money
          moves.
        </p>
      </div>
    </article>
  );
}
