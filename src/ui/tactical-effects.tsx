import { useEffect, useRef } from "react";
import type { Character } from "../types";
import type { BattleVisual, TacticalState } from "../play/tactical";
import { actorSight, heroActor } from "../play/tactical";

const COLORS: Record<BattleVisual["kind"], string> = { move: "#70dfb7", arrow: "#f8e2a3", strike: "#ffefca", fire: "#ff842d", cold: "#b1ecff", lightning: "#b5baff", force: "#df9bff", heal: "#70ffd0", ward: "#ffe7a1", fear: "#d7a0ef" };
export function TacticalEffects({ batch, cell, state, hero, enabled }: { batch: { id: number; cues: BattleVisual[] }; cell: number; state: TacticalState; hero: Character; enabled: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const node = canvas.current, ctx = node?.getContext("2d"); if (!node || !ctx) return;
    const dpr = Math.min(devicePixelRatio || 1, 2), width = 12 * cell, height = 9 * cell;
    node.width = width * dpr; node.height = height * dpr; ctx.scale(dpr, dpr);
    if (!enabled || !batch.cues.length) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0, timer = 0; const started = performance.now();
    const duration = 950 + Math.max(0, batch.cues.length - 1) * 160;
    function draw(now: number) {
      ctx!.clearRect(0, 0, width, height); ctx!.save(); ctx!.beginPath();
      for (let y = 0; y < 9; y++) for (let x = 0; x < 12; x++) if (actorSight(state, hero, heroActor(state), { x, y }).visible) ctx!.rect(x * cell, y * cell, cell, cell);
      ctx!.clip();
      batch.cues.forEach((cue, index) => {
        if (cue.kind === "move") return;
        const time = reduced ? 0.82 : (now - started - index * 160) / 950;
        if (time < 0 || time > 1) return;
        const t = Math.min(1, time * 1.5), fade = time < .7 ? 1 : (1 - time) / .3;
        const a = { x: (cue.from.x + .5) * cell, y: (cue.from.y + .5) * cell }, b = { x: (cue.to.x + .5 + (cue.hit === false ? .32 : 0)) * cell, y: (cue.to.y + .5) * cell };
        const color = COLORS[cue.kind]; ctx!.save(); ctx!.globalAlpha = fade; ctx!.strokeStyle = color; ctx!.fillStyle = color; ctx!.lineWidth = Math.max(2, cell / 18); ctx!.shadowColor = color; ctx!.shadowBlur = 9;
        if (cue.cells?.length) for (const at of cue.cells) { ctx!.globalAlpha = fade * .42; ctx!.fillRect((at.x + .08) * cell, (at.y + .08) * cell, cell * .84, cell * .84); }
        ctx!.globalAlpha = fade;
        if (["heal", "ward", "fear", "strike"].includes(cue.kind)) {
          ctx!.beginPath(); ctx!.arc(b.x, b.y, cell * (.18 + .42 * time), cue.kind === "strike" ? -.8 : 0, cue.kind === "strike" ? 2.4 : Math.PI * 2); ctx!.stroke();
          if (cue.kind === "heal") { ctx!.fillRect(b.x - cell * .05, b.y - cell * .23, cell * .1, cell * .46); ctx!.fillRect(b.x - cell * .23, b.y - cell * .05, cell * .46, cell * .1); }
        } else if (cue.kind === "lightning") {
          ctx!.beginPath(); ctx!.moveTo(a.x, a.y);
          for (let i = 1; i <= 10; i++) { const f = i / 10 * t, offset = i === 10 ? 0 : Math.sin(i * 2.7 + time * 20) * cell * .17; ctx!.lineTo(a.x + (b.x - a.x) * f + offset, a.y + (b.y - a.y) * f - offset); } ctx!.stroke();
        } else {
          const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, angle = Math.atan2(b.y - a.y, b.x - a.x);
          ctx!.beginPath(); ctx!.moveTo(a.x + (b.x - a.x) * Math.max(0, t - .18), a.y + (b.y - a.y) * Math.max(0, t - .18)); ctx!.lineTo(x, y); ctx!.stroke();
          ctx!.save(); ctx!.translate(x, y); ctx!.rotate(angle);
          if (cue.kind === "arrow") { ctx!.beginPath(); ctx!.moveTo(cell * .14, 0); ctx!.lineTo(-cell * .07, -cell * .08); ctx!.lineTo(-cell * .07, cell * .08); ctx!.closePath(); ctx!.fill(); }
          else { ctx!.beginPath(); ctx!.arc(0, 0, cell * .105, 0, Math.PI * 2); ctx!.fill(); } ctx!.restore();
          if (time > .65) { ctx!.beginPath(); ctx!.arc(b.x, b.y, cell * (.12 + (time - .65) * .6), 0, Math.PI * 2); ctx!.stroke(); }
        }
        ctx!.restore();
      }); ctx!.restore();
      if (!reduced && now - started < duration) frame = requestAnimationFrame(draw);
      else timer = window.setTimeout(() => ctx!.clearRect(0, 0, width, height), reduced ? 500 : 0);
    }
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); ctx.clearRect(0, 0, width, height); };
  }, [batch, cell, enabled]);
  return <canvas ref={canvas} className="tactical-effects" data-testid="tactical-effects" aria-hidden="true" />;
}
