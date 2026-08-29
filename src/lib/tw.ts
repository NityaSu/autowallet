export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const page = "max-w-[1100px]";
export const hello =
  "mb-1.5 text-[28px] font-bold tracking-tight text-foreground";
export const h1 = "mb-1.5 text-[26px] font-semibold tracking-tight";
export const h2 = "mt-7 mb-3 text-base font-semibold";
export const sub = "m-0 text-sm text-muted";
export const muted = "text-muted";
export const card =
  "rounded-2xl border border-line bg-white px-[22px] py-5 shadow-[0_1px_2px_rgba(28,22,18,0.04)]";
export const btnShape =
  "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border px-3.5 font-sans text-[13px] font-semibold no-underline disabled:cursor-wait disabled:opacity-55";
export const btn = cx(btnShape, "border-line bg-white text-foreground");
export const btnPrimary = cx(btnShape, "border-brand bg-brand text-white");
export const btnAccent = cx(btnShape, "border-brand bg-white text-brand");
export const textBtn =
  "cursor-pointer border-0 bg-transparent font-sans text-[13px] font-semibold text-brand";
export const field = "flex flex-col gap-1.5 text-xs font-semibold text-muted";
export const control =
  "h-[38px] rounded-[10px] border border-line bg-white px-2.5 font-sans text-[13px] text-foreground outline-none";
export const kicker =
  "block text-xs font-semibold uppercase tracking-wide text-muted";
export const handle = "mt-0.5 font-mono text-[13px] text-muted";
export const avatar =
  "grid size-10 shrink-0 place-items-center rounded-xl bg-soft text-brand";
export const name = "m-0 text-base font-semibold";
export const statusOk =
  "rounded-full bg-[#eaf7ef] px-2.5 py-1 text-xs font-semibold text-ok";
export const statusPaused =
  "rounded-full bg-[#fdecea] px-2.5 py-1 text-xs font-semibold text-bad";
export const meta = "mt-1.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3";
export const row = "flex flex-wrap items-end justify-between gap-3";
export const list = "grid gap-3";
export const grid2 = "grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_1.15fr]";
export const back =
  "mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted no-underline hover:text-foreground";
export const pay =
  "m-0 list-none overflow-hidden rounded-2xl border border-line bg-white p-0";
export const payItem =
  "grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line px-[18px] py-[13px] text-sm last:border-b-0 md:grid-cols-[1fr_auto_auto]";
export const amt = "font-mono font-semibold tabular-nums";
export const ok = "text-xs font-semibold not-italic text-ok";
export const bad = "text-xs font-semibold not-italic text-bad";
export const pillOk =
  "inline-flex rounded-full bg-[#eaf7ef] px-2 py-[3px] text-xs font-semibold not-italic text-ok";
export const pillBad =
  "inline-flex rounded-full bg-[#fdecea] px-2 py-[3px] text-xs font-semibold not-italic text-bad";
export const note =
  "mt-[18px] rounded-xl border border-[#f3d2b0] bg-soft px-4 py-3.5 text-sm leading-relaxed text-foreground";
export const stat =
  "flex justify-between gap-3 rounded-2xl border border-line bg-white p-[18px]";
export const stats = "mb-4 grid grid-cols-1 gap-3.5 xl:grid-cols-4";
export const agent = "flex flex-col gap-2.5";
export const agentHead = "flex items-start justify-between gap-3";
export const who = "flex items-center gap-3";
export const brand =
  "flex items-center gap-2.5 text-left text-foreground no-underline";
export const brandName =
  "block font-brand text-sm font-extrabold uppercase tracking-[0.28em] [font-feature-settings:normal]";
export const brandTag = "mt-0.5 block font-sans text-[11px] not-italic text-muted";
export const ovSplit =
  "mb-3.5 grid grid-cols-1 gap-3.5 xl:grid-cols-[1.35fr_0.9fr]";
export const ovIco =
  "grid size-9 shrink-0 place-items-center rounded-[10px] bg-soft text-brand";
export const ovIcoOk =
  "grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#eaf7ef] text-ok";
export const allow =
  "mt-2.5 mb-0 list-none p-0 [&>li]:flex [&>li]:items-center [&>li]:justify-between [&>li]:border-b [&>li]:border-line [&>li]:py-2 [&>li]:text-[13px]";
export const log =
  "mt-3.5 mb-0 whitespace-pre-wrap rounded-xl bg-[#1c1612] px-4 py-3.5 font-mono text-xs leading-[1.55] text-[#f3d5b5]";
