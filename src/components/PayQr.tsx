"use client";

import { useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { payLinkFor } from "@/components/CopyHandle";

function subscribe() {
  return () => {};
}

function originClient() {
  return window.location.origin;
}

function originServer() {
  return "";
}

export function PayQr({
  handle,
  size = 80,
  className,
}: {
  handle: string;
  size?: number;
  className?: string;
}) {
  const origin = useSyncExternalStore(subscribe, originClient, originServer);

  if (!handle || !origin) {
    return <div className={className} aria-hidden />;
  }

  return (
    <div className={className} aria-label={`Scan to send money to ${handle}`}>
      <QRCodeSVG
        value={payLinkFor(handle, origin)}
        size={size}
        marginSize={1}
        level="M"
        bgColor="#ffffff"
        fgColor="#1c1612"
      />
    </div>
  );
}
