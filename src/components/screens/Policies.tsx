"use client";

import { FormEvent, useState } from "react";
import { SpendBar } from "@/components/SpendBar";
import { useWallet } from "@/context/WalletProvider";
import { money } from "@/lib/money";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

export function Policies() {
  const { agents, addAllowHost, dropAllowHost, setCaps } = useWallet();
  const [selectedId, setSelectedId] = useState(agents[0]?.id ?? "");
  const [newHost, setNewHost] = useState("");
  const selected = agents.find((a) => a.id === selectedId) ?? agents[0];

  function addHost(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    addAllowHost(selected.id, newHost);
    setNewHost("");
  }

  if (!selected) return null;

  return (
    <section className={tw.page}>
      <h1 className={tw.h1}>Policies</h1>
      <p className={tw.sub}>
        Daily cap, per-request max, and domain allowlist — the layer x402 does
        not ship.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {agents.map((agent) => (
          <button
            key={agent.id}
            type="button"
            className={selectedId === agent.id ? tw.btnPrimary : tw.btn}
            onClick={() => setSelectedId(agent.id)}
          >
            {agent.handle}
          </button>
        ))}
      </div>
      <article className={tw.card}>
        <h2 className={cx(tw.h2, "mt-0")}>{selected.name}</h2>
        <label className={tw.field}>
          Daily limit {money(selected.dailyCapUsd)}
          <input
            className="w-full"
            value={selected.dailyCapUsd}
            onChange={(e) =>
              setCaps(selected.id, { dailyCapUsd: Number(e.target.value) })
            }
            type="range"
            min={0.5}
            max={50}
            step={0.5}
          />
        </label>
        <label className={cx(tw.field, "mt-3.5")}>
          Per request {money(selected.perRequestMaxUsd)}
          <input
            className="w-full"
            value={selected.perRequestMaxUsd}
            onChange={(e) =>
              setCaps(selected.id, {
                perRequestMaxUsd: Number(e.target.value),
              })
            }
            type="range"
            min={0.01}
            max={5}
            step={0.01}
          />
        </label>
        <SpendBar spent={selected.spentTodayUsd} cap={selected.dailyCapUsd} />
        <p className={cx(tw.kicker, "mt-5")}>Allowed APIs</p>
        <ul className={tw.allow}>
          {selected.allowlist.map((host) => (
            <li key={host}>
              {host}
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent text-xs text-muted"
                onClick={() => dropAllowHost(selected.id, host)}
              >
                remove
              </button>
            </li>
          ))}
        </ul>
        <form className={cx(tw.row, "mt-3")} onSubmit={addHost}>
          <label className={cx(tw.field, "flex-1")}>
            Add host
            <input
              className={tw.control}
              value={newHost}
              onChange={(e) => setNewHost(e.target.value)}
              type="text"
              placeholder="api.search.com"
            />
          </label>
          <button type="submit" className={tw.btn}>
            Add
          </button>
        </form>
      </article>
    </section>
  );
}
