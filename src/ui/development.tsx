import { developmentPaths, resolveDevelopment } from "../data/development";
import type { DevelopmentPlan } from "../types";

export function DevelopmentPlanner({ classId, system = "pf2e", value, onChange }: { classId: string; system?: "pf2e" | "dnd5e"; value?: DevelopmentPlan; onChange: (plan: DevelopmentPlan) => void }) {
  const { plan, path } = resolveDevelopment(classId, value);
  return <section className="development-planner stack" data-testid="development-planner">
    <h2>Путь развития</h2>
    <div className="seg" aria-label="Сложность пути">
      {(["simple", "complex"] as const).map(mode => <button key={mode} type="button" className={`pill ${plan.complexity === mode ? "on" : ""}`} aria-pressed={plan.complexity === mode} data-testid={`development-${mode}`} onClick={() => onChange(resolveDevelopment(classId, { ...plan, complexity: mode }).plan)}>{mode === "simple" ? "Простой" : "Сложный"}</button>)}
    </div>
    <p className="tiny">{plan.complexity === "simple" ? "Меньше отдельных ресурсов и условий. Сначала освоим основную роль." : `Больше развилок и сочетаний: ${system === "pf2e" ? "черты и архетипы" : "черты и решения подкласса"}. Сложнее не значит сильнее в любой ситуации.`}</p>
    <p className="tiny">{system === "pf2e" ? "Pathfinder: архетип развивает отдельную специализацию, а следопыт — это класс." : "Подземелья и драконы: используем правила выбранного года. Посвящения и три действия из Pathfinder сюда не переносятся."}</p>
    <label className="field"><span>Направление</span><select data-testid="development-path" value={path.id} onChange={event => onChange({ ...plan, path: event.target.value })}>{developmentPaths(classId, plan.complexity).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
    <p><b>Задача.</b> {path.role}</p>
    <p><b>Тактика.</b> {path.turn}</p>
    <p><b>Цена выбора.</b> {path.caution}</p>
    <details><summary>Развилки по уровням</summary><ol className="development-stages">{path.stages.map(stage => <li key={stage}>{stage}</li>)}</ol><p className="tiny">Это ориентир, не автоматическая сборка. Ниже предлагаются только доступные варианты выбранной редакции; прежние решения не сбрасываются.</p></details>
  </section>;
}
