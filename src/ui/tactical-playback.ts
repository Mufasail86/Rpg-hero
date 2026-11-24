import { useEffect, useRef, useState } from "react";
import type { Cell } from "../play/tactical-map";
import type { BattleVisual, TacticalState } from "../play/tactical";

export function useTacticalPlayback() {
  const counter = useRef(0);
  const [packet, setPacket] = useState<{ id: number; before: TacticalState | null; next: TacticalState | null; animate: boolean } | null>(null);
  const [positions, setPositions] = useState<Record<string, Cell>>({});
  const [busy, setBusy] = useState(false), [actor, setActor] = useState("");
  const [batch, setBatch] = useState<{ id: number; cues: BattleVisual[] }>({ id: 0, cues: [] });
  const active = packet?.animate && busy;
  useEffect(() => {
    let cancelled = false, timer = 0, resolveWait: (() => void) | undefined;
    function wait(ms: number) { return new Promise<void>(resolve => { resolveWait = resolve; timer = window.setTimeout(resolve, ms); }); }
    const next = packet?.next, cues = next?.visuals ?? [];
    const final = Object.fromEntries(next?.actors.map(row => [row.id, row.pos]) ?? []);
    const animate = packet?.animate && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate || !cues.length) {
      setPositions(final); setBusy(false); setActor("");
      setBatch({ id: counter.current++, cues: animate ? cues.filter(row => row.kind !== "move") : [] });
      return;
    }
    const initial = Object.fromEntries((packet.before?.actors ?? next!.actors).map(row => [row.id, row.pos]));
    for (const row of cues.slice().reverse()) if (row.kind === "move" && row.actor) initial[row.actor] = row.from;
    setPositions(initial); setBusy(true);
    void (async () => {
      await wait(30);
      for (const cue of cues) {
        if (cancelled) return;
        if (cue.kind === "move" && cue.actor) {
          setActor(cue.actor); setPositions(old => ({ ...old, [cue.actor!]: cue.to })); await wait(160);
        } else {
          setActor(next?.actors.find(row => row.pos.x === cue.from.x && row.pos.y === cue.from.y)?.id ?? "");
          setBatch({ id: counter.current++, cues: [cue] }); await wait(950);
        }
      }
      if (!cancelled) { setPositions(final); setBusy(false); setActor(""); }
    })();
    return () => { cancelled = true; clearTimeout(timer); resolveWait?.(); };
  }, [packet]);
  function play(before: TacticalState | null, next: TacticalState | null, animate: boolean) {
    setBusy(Boolean(animate && next?.visuals?.length && !matchMedia("(prefers-reduced-motion: reduce)").matches));
    setPacket({ id: counter.current++, before, next, animate });
  }
  return { play, positions, busy: Boolean(active), actor, batch, before: packet?.before };
}
