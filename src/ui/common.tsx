import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { PORTRAIT_PROVENANCE } from "./art";

const InfoContext = createContext<(title: string, text: string) => void>(() => {});

export function InfoProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<{ title: string; text: string } | null>(null);
  return (
    <InfoContext.Provider value={(title, text) => setInfo({ title, text })}>
      {children}
      {info && (
        <div className="sheet-layer" role="dialog" aria-modal="true" aria-label={info.title}>
          <button type="button" className="backdrop" aria-label="Закрыть справку" onClick={() => setInfo(null)} />
          <div className="info-card">
            <div className="row-between">
              <h2>{info.title}</h2>
              <button type="button" className="text-btn" onClick={() => setInfo(null)}>
                Закрыть
              </button>
            </div>
            <p className="prose">{info.text}</p>
          </div>
        </div>
      )}
    </InfoContext.Provider>
  );
}

export function useInfo(): (title: string, text: string) => void {
  return useContext(InfoContext);
}

export function Info({ title, text }: { title: string; text: string }) {
  const open = useInfo();
  return (
    <button type="button" className="info-btn" aria-label={`Справка: ${title}`} onClick={(event) => { event.stopPropagation(); open(title, text); }}>
      ℹ️
    </button>
  );
}

export function money(copper: number): string {
  const sign = copper < 0 ? "−" : "";
  let rest = Math.abs(Math.round(copper));
  const gp = Math.floor(rest / 100);
  rest %= 100;
  const sp = Math.floor(rest / 10);
  const cp = rest % 10;
  const parts: string[] = [];
  if (gp) parts.push(`${gp} зм`);
  if (sp) parts.push(`${sp} см`);
  if (cp || parts.length === 0) parts.push(`${cp} мм`);
  return sign + parts.join(" ");
}

export function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

export function go(hash: string) {
  if (window.location.hash === hash) window.dispatchEvent(new HashChangeEvent("hashchange"));
  else window.location.hash = hash;
}

/** Компактный бой включён, пока игрок сам не выключит его в этой вкладке. */
export function useCompact(): [boolean, () => void] {
  const [on, setOn] = useState(() => {
    try {
      return sessionStorage.getItem("rpg-compact") !== "0";
    } catch {
      return true;
    }
  });
  function toggle() {
    setOn((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem("rpg-compact", next ? "1" : "0");
      } catch {
        /* приватный режим */
      }
      return next;
    });
  }
  return [on, toggle];
}

export function Choice({
  id,
  name,
  hint,
  info,
  short,
  art,
  on,
  onPick,
  testId,
  disabled,
  reason,
}: {
  id: string;
  name: string;
  hint?: string;
  info: string;
  short?: string;
  art?: string;
  on: boolean;
  onPick: () => void;
  testId?: string;
  disabled?: boolean;
  reason?: string;
}) {
  return (
    <div className={`option ${on ? "on" : ""} ${disabled ? "locked" : ""}`}>
      {art ? <img className="option-art" src={art} alt="" title={PORTRAIT_PROVENANCE} data-provenance={PORTRAIT_PROVENANCE} loading="lazy" decoding="async" /> : null}
      <button type="button" className="option-main" data-testid={testId ?? `opt-${id}`} aria-pressed={on} disabled={disabled} onClick={onPick}>
        <b>{name}</b>
        {reason ? <small>{reason}</small> : hint ? <small>{hint}</small> : null}
      </button>
      <Info title={name} text={short ? `${short}\n\n${info}` : info} />
    </div>
  );
}
