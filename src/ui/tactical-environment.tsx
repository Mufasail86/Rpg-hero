import { characterVision, type Environment } from "../play/tactical-vision";
import type { Character } from "../types";

export function TacticalEnvironment({ hero, value, disabled, onChange }: { hero: Character; value: Environment; disabled: boolean; onChange: (next: Environment) => void }) {
  const native = characterVision(hero);
  return <fieldset className="tactical-environment" disabled={disabled}><legend>Свет и зрение</legend><div className="tactical-setup-fields">
    <label className="field"><span>Освещение</span><select data-testid="training-light" value={value.light} onChange={event => onChange({ ...value, light: event.target.value as Environment["light"] })}><option value="bright">Яркий свет</option><option value="dim">Сумрак</option><option value="dark">Полная темнота</option></select></label>
    <label className="field"><span>Зрение</span><select data-testid="training-vision" value={value.vision} onChange={event => onChange({ ...value, vision: event.target.value as Environment["vision"] })}><option value="character">По листу · {hero.senses}</option><option value="normal">Обычное · для сравнения</option>{hero.system === "pf2e" && <option value="low-light">Сумеречное · для сравнения</option>}<option value="darkvision">Тёмное · для сравнения</option></select></label>
    {hero.system === "dnd5e" && value.vision === "darkvision" && <label className="field"><span>Дальность тёмного зрения, футы</span><select value={value.range} onChange={event => onChange({ ...value, range: Number(event.target.value) })}>{[30, 60, 90, 120, 150].map(feet => <option key={feet} value={feet}>{feet}</option>)}</select></label>}
    <label className="tactical-checkbox"><input data-testid="training-torch" type="checkbox" checked={value.torch} onChange={event => onChange({ ...value, torch: event.target.checked })} />Учебный факел · 20 футов света + 20 сумрака</label>
  </div><p className="tiny">{hero.system === "pf2e" ? "Сумеречное зрение убирает сокрытие из-за сумрака, но не видит в полной темноте. Тёмное зрение на этом поле не ограничено дальностью." : `У D&D нет отдельного сумеречного зрения. Тёмное зрение: в темноте как в тусклом свете, без цвета; по листу ${native.range} футов.`} Магическая тьма, слепое зрение, слух и нюх пока не моделируются. Факел здесь не занимает руку; это настройка опыта, а не бесплатное снаряжение героя.</p></fieldset>;
}
