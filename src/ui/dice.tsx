import { useEffect, useRef, useState } from "react";

export interface RollPreset {
  label: string;
  mod: number;
  die?: number;
  mode?: "normal" | "adv" | "dis";
  dc?: number;
  system?: "dnd5e" | "pf2e";
}

const ROLL_KEY = "rpg-hero-roll";
const DICE = [4, 6, 8, 10, 12, 20, 100];

export function queueRoll(preset: RollPreset) {
  sessionStorage.setItem(ROLL_KEY, JSON.stringify(preset));
}

function takePreset(): RollPreset | null {
  const raw = sessionStorage.getItem(ROLL_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(ROLL_KEY);
  try {
    return JSON.parse(raw) as RollPreset;
  } catch {
    return null;
  }
}

const PIPS: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

const FACE_PLACE = [
  { n: 1, transform: "rotateY(0deg) translateZ(34px)" },
  { n: 6, transform: "rotateY(180deg) translateZ(34px)" },
  { n: 2, transform: "rotateY(90deg) translateZ(34px)" },
  { n: 5, transform: "rotateY(-90deg) translateZ(34px)" },
  { n: 3, transform: "rotateX(90deg) translateZ(34px)" },
  { n: 4, transform: "rotateX(-90deg) translateZ(34px)" },
];

const SHOW: Record<number, string> = {
  1: "rotateX(0deg) rotateY(0deg)",
  2: "rotateX(0deg) rotateY(-90deg)",
  3: "rotateX(-90deg) rotateY(0deg)",
  4: "rotateX(90deg) rotateY(0deg)",
  5: "rotateX(0deg) rotateY(90deg)",
  6: "rotateX(0deg) rotateY(180deg)",
};

interface DieState {
  value: number;
  spinning: boolean;
  tumble: string;
}

function rollDie(sides: number): number {
  return 1 + Math.floor(Math.random() * sides);
}

function degree(system: "dnd5e" | "pf2e" | undefined, total: number, dc: number, natural: number | null, sides: number): string {
  if (system === "pf2e" && sides === 20 && natural != null) {
    let step = total >= dc + 10 ? 3 : total >= dc ? 2 : total > dc - 10 ? 1 : 0;
    if (natural === 20) step = Math.min(3, step + 1);
    if (natural === 1) step = Math.max(0, step - 1);
    return ["критический провал", "провал", "успех", "критический успех"][step];
  }
  if (sides === 20 && natural === 20) return total >= dc ? "успех, на кости 20" : "на кости 20, итог ниже СЛ";
  if (sides === 20 && natural === 1) return total >= dc ? "на кости 1, итог всё же дотягивает" : "на кости 1";
  return total >= dc ? "успех" : "провал";
}

export function DicePanel() {
  const preset = useRef(takePreset());
  const initial = preset.current;
  const [sides, setSides] = useState(initial?.die ?? 20);
  const [count, setCount] = useState(initial?.mode === "adv" || initial?.mode === "dis" ? 2 : 1);
  const [mod, setMod] = useState(initial?.mod ?? 0);
  const [mode, setMode] = useState<RollPreset["mode"]>(initial?.mode ?? "normal");
  const [dc, setDc] = useState(initial?.dc ? String(initial.dc) : "");
  const [pf, setPf] = useState(initial?.system === "pf2e");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [autoRoll, setAutoRoll] = useState(false);
  const [dice, setDice] = useState<DieState[]>([{ value: 20, spinning: false, tumble: SHOW[1] }]);
  const [banner, setBanner] = useState("Нажмите «Бросить» или встряхните телефон.");
  const [history, setHistory] = useState<string[]>([]);
  const [armed, setArmed] = useState(false);
  const [shakeNote, setShakeNote] = useState("Встряхивание: на iPhone сначала разрешите доступ к движению.");
  const rollRef = useRef<() => void>(() => {});
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function roll() {
    const n = mode === "adv" || mode === "dis" ? 2 : Math.min(8, Math.max(1, count));
    const useSides = mode === "adv" || mode === "dis" ? 20 : sides;
    const values = Array.from({ length: n }, () => rollDie(useSides));
    const tumble = `rotateX(${640 + Math.random() * 360}deg) rotateY(${480 + Math.random() * 360}deg)`;
    setDice(values.map((value) => ({ value, spinning: true, tumble })));
    window.setTimeout(() => {
      setDice(values.map((value) => ({ value, spinning: false, tumble: useSides === 6 ? SHOW[value] : "" })));
      const kept = mode === "adv" ? Math.max(...values) : mode === "dis" ? Math.min(...values) : values.reduce((s, v) => s + v, 0);
      const total = kept + mod;
      const natural = values.length === 1 || mode === "adv" || mode === "dis" ? (mode === "adv" ? Math.max(...values) : mode === "dis" ? Math.min(...values) : values[0]) : null;
      const dcNum = Number(dc);
      const verdict = dc !== "" && !Number.isNaN(dcNum) ? degree(pf ? "pf2e" : "dnd5e", total, dcNum, natural, useSides) : "";
      const shown = values.join(" + ");
      const text = `${label ? label + ": " : ""}${shown}${mod ? ` ${mod >= 0 ? "+" : "−"} ${Math.abs(mod)}` : ""} = ${total}${mode === "adv" ? " (преимущество)" : mode === "dis" ? " (помеха)" : ""}${verdict ? ` · ${verdict}` : ""}`;
      setBanner(text);
      setHistory((prev) => [text, ...prev].slice(0, 8));
      if (navigator.vibrate) navigator.vibrate(18);
    }, reduced ? 40 : 700);
  }

  rollRef.current = roll;

  useEffect(() => {
    if (!autoRoll) return;
    setAutoRoll(false);
    rollRef.current();
  }, [autoRoll]);

  useEffect(() => {
    function onQueued() {
      const next = takePreset();
      if (!next) return;
      setSides(next.die ?? 20);
      setCount(next.mode === "adv" || next.mode === "dis" ? 2 : 1);
      setMod(next.mod);
      setMode(next.mode ?? "normal");
      setDc(next.dc ? String(next.dc) : "");
      setPf(next.system === "pf2e");
      setLabel(next.label);
      setAutoRoll(true);
    }
    window.addEventListener("rpg-roll", onQueued);
    return () => window.removeEventListener("rpg-roll", onQueued);
  }, []);

  useEffect(() => {
    if (!armed) return;
    let prev = 0;
    const onMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x == null || acc.y == null || acc.z == null) return;
      const mag = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);
      const delta = Math.abs(mag - prev);
      prev = mag;
      if (delta > 16) rollRef.current();
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [armed]);

  async function enableShake() {
    const motion = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    try {
      if (typeof motion.requestPermission === "function") {
        const result = await motion.requestPermission();
        if (result !== "granted") {
          setShakeNote("Доступ к движению не дан. Бросайте кнопкой.");
          return;
        }
      }
      setArmed(true);
      setShakeNote("Встряхните телефон, чтобы бросить.");
    } catch {
      setArmed(true);
      setShakeNote("Если телефон отдаёт движение, встряхивание бросает кости. Иначе — кнопка.");
    }
  }

  return (
    <div className="stack" data-dice-live>
      <div className="tray" aria-hidden="false">
        {dice.map((die, index) => {
          const left = 18 + (index % 4) * 78;
          const top = 36 + Math.floor(index / 4) * 96;
          if ((mode === "adv" || mode === "dis" ? 20 : sides) === 6) {
            return (
              <div key={index} className="die" style={{ left, top }}>
                <div className={`cube ${die.spinning ? "" : "settle"}`} style={{ transform: die.spinning ? die.tumble : die.tumble || SHOW[die.value] || SHOW[1] }}>
                  {FACE_PLACE.map((face) => (
                    <div key={face.n} className="face" style={{ transform: face.transform }}>
                      {Array.from({ length: 9 }, (_, pip) => (
                        <span key={pip} className={`pip ${face.n === 1 ? "red" : ""}`} style={{ opacity: PIPS[face.n].includes(pip + 1) ? 1 : 0 }} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          const kind = mode === "adv" || mode === "dis" ? 20 : sides;
          return (
            <div key={index} className="die" style={{ left, top }}>
              <div className={`token d${kind} ${die.spinning ? "spin" : ""}`}>{die.spinning ? "?" : die.value}</div>
            </div>
          );
        })}
      </div>
      <div className="result-banner">
        <strong>{banner}</strong>
      </div>
      <div className="wrap">
        {DICE.map((die) => (
          <button key={die} type="button" className={`pill ${sides === die && mode === "normal" ? "on" : ""}`} onClick={() => { setSides(die); setMode("normal"); }}>
            к{die === 100 ? "100" : die}
          </button>
        ))}
      </div>
      <div className="seg">
        <button type="button" className={`pill ${mode === "normal" ? "on" : ""}`} onClick={() => setMode("normal")}>Обычный</button>
        <button type="button" className={`pill ${mode === "adv" ? "on" : ""}`} onClick={() => setMode("adv")}>Преимущество</button>
        <button type="button" className={`pill ${mode === "dis" ? "on" : ""}`} onClick={() => setMode("dis")}>Помеха</button>
      </div>
      <div className="grid-2">
        <label className="field">
          <span>Костей</span>
          <input type="number" inputMode="numeric" min={1} max={8} value={count} onChange={(event) => setCount(Number(event.target.value) || 1)} />
        </label>
        <label className="field">
          <span>Модификатор</span>
          <input type="number" inputMode="numeric" value={mod} onChange={(event) => setMod(Number(event.target.value) || 0)} />
        </label>
      </div>
      <label className="field">
        <span>Сложность, если нужна</span>
        <input type="number" inputMode="numeric" value={dc} placeholder="пусто" onChange={(event) => setDc(event.target.value)} />
      </label>
      <button type="button" className={`pill ${pf ? "on" : ""}`} onClick={() => setPf((value) => !value)}>
        Ступени успеха ремастера {pf ? "включены" : "выключены"}
      </button>
      <button type="button" className="btn primary" data-testid="roll-dice" onClick={roll}>
        Бросить
      </button>
      <button type="button" className="btn" onClick={enableShake}>
        {armed ? "Встряхивание включено" : "Разрешить встряхивание"}
      </button>
      <p className="tiny">{shakeNote} Преимущество и помеха бросают два к20 и берут больший или меньший, затем прибавляют модификатор. В ремастере натуральная 20 поднимает ступень успеха, натуральная 1 опускает.</p>
      {history.length > 0 && (
        <div className="card history">
          {history.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}
