"use client";

import { FormEvent, useState } from "react";
import { SpendBar } from "@/components/SpendBar";
import { useWallet } from "@/context/WalletProvider";
import { money } from "@/lib/money";

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
    <section className="aw-page">
      <h1 className="aw-h1">Policies</h1>
      <p className="aw-sub">
        Daily cap, per-request max, and domain allowlist — the layer x402 does
        not ship.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {agents.map((agent) => (
          <button
            key={agent.id}
            type="button"
            className={`aw-btn${selectedId === agent.id ? " primary" : ""}`}
            onClick={() => setSelectedId(agent.id)}
          >
            {agent.handle}
          </button>
        ))}
      </div>
      <article className="aw-card">
        <h2 className="aw-h2" style={{ marginTop: 0 }}>
          {selected.name}
        </h2>
        <label className="aw-field">
          Daily limit {money(selected.dailyCapUsd)}
          <input
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
        <label className="aw-field" style={{ marginTop: 14 }}>
          Per request {money(selected.perRequestMaxUsd)}
          <input
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
        <p className="aw-kicker" style={{ marginTop: 20 }}>
          Allowed APIs
        </p>
        <ul className="aw-allow">
          {selected.allowlist.map((host) => (
            <li key={host}>
              {host}
              <button
                type="button"
                onClick={() => dropAllowHost(selected.id, host)}
              >
                remove
              </button>
            </li>
          ))}
        </ul>
        <form className="aw-row" style={{ marginTop: 12 }} onSubmit={addHost}>
          <label className="aw-field" style={{ flex: 1 }}>
            Add host
            <input
              value={newHost}
              onChange={(e) => setNewHost(e.target.value)}
              type="text"
              placeholder="api.search.com"
            />
          </label>
          <button type="submit" className="aw-btn">
            Add
          </button>
        </form>
      </article>
    </section>
  );
}
