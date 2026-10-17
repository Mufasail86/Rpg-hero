import type { DeathTrack } from "../types";

export type { DeathTrack };

export interface Body {
  hpCurrent: number;
  hpTemp: number;
  conditions: string[];
  values: Record<string, number>;
  death: DeathTrack;
}

export interface HarmPreview {
  body: Body;
  text: string;
  blocked: boolean;
}

function copy(body: Body): Body {
  return {
    hpCurrent: body.hpCurrent,
    hpTemp: body.hpTemp,
    conditions: [...body.conditions],
    values: { ...body.values },
    death: { success: body.death.success, fail: body.death.fail, stable: body.death.stable },
  };
}

function has(body: Body, id: string): boolean {
  return body.conditions.includes(id);
}

function add(body: Body, id: string) {
  if (!has(body, id)) body.conditions.push(id);
}

function drop(body: Body, id: string) {
  body.conditions = body.conditions.filter((item) => item !== id);
  delete body.values[id];
}

function value(body: Body, id: string): number {
  return body.values[id] ?? 0;
}

function setValue(body: Body, id: string, next: number) {
  if (next <= 0) {
    drop(body, id);
    return;
  }
  add(body, id);
  body.values[id] = next;
}

export function emptyDeath(): DeathTrack {
  return { success: 0, fail: 0, stable: false };
}

export function pfRestHeal(level: number, conMod: number): number {
  return Math.max(1, level) * Math.max(1, conMod);
}

function degree(natural: number, dc: number): number {
  const face = Math.max(1, Math.min(20, Math.trunc(natural)));
  let step = face >= dc + 10 ? 3 : face >= dc ? 2 : face > dc - 10 ? 1 : 0;
  if (face === 20) step = Math.min(3, step + 1);
  if (face === 1) step = Math.max(0, step - 1);
  return step;
}

function finishDying(body: Body) {
  const wounded = value(body, "wounded") + 1;
  drop(body, "dying");
  setValue(body, "wounded", wounded);
  add(body, "unconscious");
}

function markDead(body: Body, why: string): string {
  add(body, "dead");
  drop(body, "dying");
  drop(body, "unconscious");
  body.death = emptyDeath();
  return why;
}

export function previewDamage(
  system: "pf2e" | "dnd5e",
  body: Body,
  amount: number,
  max: number,
  flags: { crit?: boolean; nonlethal?: boolean } = {},
): HarmPreview {
  if (!Number.isInteger(amount) || amount < 1) return { body, text: "Нужно целое число урона больше нуля.", blocked: true };
  if (has(body, "dead")) return { body, text: "Персонаж уже мёртв. Урон ничего не меняет.", blocked: true };
  const next = copy(body);
  const tempTaken = Math.min(next.hpTemp, amount);
  next.hpTemp -= tempTaken;
  let left = amount - tempTaken;
  const hpTaken = Math.min(next.hpCurrent, left);
  next.hpCurrent -= hpTaken;
  left -= hpTaken;
  const lines = [`Урон ${amount}. Временные хиты снимают ${tempTaken}, обычные ${hpTaken}.`];
  if (next.hpCurrent > 0) return { body: next, text: lines.join(" "), blocked: false };
  if (hpTaken === 0 && left === 0) return { body: next, text: `${lines.join(" ")} До хитов урон не дошёл.`, blocked: false };

  if (system === "pf2e") {
    if (flags.nonlethal && !has(body, "dying")) {
      add(next, "unconscious");
      lines.push("Несмертельный урон: без сознания, умирание не начинается.");
      return { body: next, text: lines.join(" "), blocked: false };
    }
    if (has(body, "dying") || (body.hpCurrent === 0 && has(body, "dying"))) {
      const bump = (flags.crit ? 2 : 1);
      const dying = value(body, "dying") + bump;
      if (dying >= 4) {
        lines.push(markDead(next, "Умирание достигло 4. Персонаж мёртв."));
        return { body: next, text: lines.join(" "), blocked: false };
      }
      setValue(next, "dying", dying);
      lines.push(`Уже умирает: значение растёт на ${bump}, сейчас ${dying}. Ранение не прибавляется повторно.`);
      return { body: next, text: lines.join(" "), blocked: false };
    }
    const dying = (flags.crit ? 2 : 1) + value(body, "wounded");
    if (dying >= 4) {
      lines.push(markDead(next, "Умирание сразу 4 из-за ранения. Персонаж мёртв."));
      return { body: next, text: lines.join(" "), blocked: false };
    }
    setValue(next, "dying", dying);
    add(next, "unconscious");
    lines.push(`Хиты на нуле. Умирание ${dying}${value(body, "wounded") ? " с учётом ранения" : ""}. Без сознания.`);
    return { body: next, text: lines.join(" "), blocked: false };
  }

  if (left >= max) {
    lines.push(markDead(next, "Урон не меньше максимума хитов. Мгновенная смерть."));
    return { body: next, text: lines.join(" "), blocked: false };
  }
  if (body.hpCurrent === 0) {
    const bump = flags.crit ? 2 : 1;
    next.death.stable = false;
    next.death.fail += bump;
    lines.push(`Уже на нуле: ${bump === 2 ? "критический удар даёт два провала" : "ещё один провал"} спасброска от смерти.`);
    if (next.death.fail >= 3) lines.push(markDead(next, "Три провала. Персонаж мёртв."));
    else add(next, "unconscious");
    return { body: next, text: lines.join(" "), blocked: false };
  }
  next.death = emptyDeath();
  add(next, "unconscious");
  lines.push("Хиты на нуле. Без сознания, спасброски от смерти с нуля.");
  return { body: next, text: lines.join(" "), blocked: false };
}

export function previewHeal(system: "pf2e" | "dnd5e", body: Body, amount: number, max: number): HarmPreview {
  if (!Number.isInteger(amount) || amount < 1) return { body, text: "Нужно целое лечение больше нуля.", blocked: true };
  if (has(body, "dead")) return { body, text: "Мёртвого это лечение не поднимает.", blocked: true };
  const next = copy(body);
  const wasDying = has(body, "dying");
  next.hpCurrent = Math.min(max, next.hpCurrent + amount);
  const lines = [`Лечение ${amount}. Текущие хиты ${next.hpCurrent} из ${max}. Временные хиты не тронуты: ${next.hpTemp}.`];
  if (next.hpCurrent > 0) {
    if (system === "pf2e" && wasDying) {
      const wounded = value(body, "wounded") + 1;
      drop(next, "dying");
      drop(next, "unconscious");
      setValue(next, "wounded", wounded);
      lines.push(`Умирание снято. Ранение стало ${wounded}.`);
    } else {
      drop(next, "dying");
      drop(next, "unconscious");
      next.death = emptyDeath();
    }
  }
  return { body: next, text: lines.join(" "), blocked: false };
}

export function recoveryCheck(body: Body, natural: number): HarmPreview {
  if (!has(body, "dying")) return { body, text: "Проверка восстановления нужна, только когда персонаж умирает.", blocked: true };
  const dying = value(body, "dying");
  const dc = 10 + dying;
  const step = degree(natural, dc);
  const next = copy(body);
  const names = ["критический провал", "провал", "успех", "критический успех"];
  const delta = step === 3 ? -2 : step === 2 ? -1 : step === 1 ? 1 : 2;
  let now = dying + delta;
  const lines = [`Чистая кость ${natural} против СЛ ${dc}: ${names[step]}. Умирание ${delta > 0 ? "+" : ""}${delta}.`];
  if (now <= 0) {
    finishDying(next);
    lines.push(`Умирание кончилось. Ранение стало ${value(next, "wounded")}. Хиты всё ещё 0, персонаж без сознания.`);
    return { body: next, text: lines.join(" "), blocked: false };
  }
  if (now >= 4) {
    lines.push(markDead(next, "Умирание достигло 4. Персонаж мёртв."));
    return { body: next, text: lines.join(" "), blocked: false };
  }
  setValue(next, "dying", now);
  lines.push(`Умирание сейчас ${now}.`);
  return { body: next, text: lines.join(" "), blocked: false };
}

export function deathSave(body: Body, natural: number, max: number): HarmPreview {
  if (has(body, "dead")) return { body, text: "Спасбросок мёртвому не нужен.", blocked: true };
  if (body.hpCurrent > 0) return { body, text: "Спасбросок от смерти делают на нуле хитов.", blocked: true };
  if (body.death.stable) return { body, text: "Персонаж стабилен. Новый урон снимет стабильность.", blocked: true };
  const face = Math.max(1, Math.min(20, Math.trunc(natural)));
  const next = copy(body);
  if (face === 20) {
    next.hpCurrent = 1;
    next.death = emptyDeath();
    drop(next, "unconscious");
    return { body: next, text: "Натуральная 20: 1 хит и сознание. Счёт успеха и провала сброшен.", blocked: false };
  }
  if (face === 1) next.death.fail += 2;
  else if (face >= 10) next.death.success += 1;
  else next.death.fail += 1;
  if (next.death.fail >= 3) {
    return { body: next, text: markDead(next, `Кость ${face}. Провалов ${Math.min(3, next.death.fail)}. Персонаж мёртв.`), blocked: false };
  }
  if (next.death.success >= 3) {
    next.death.stable = true;
    next.death.success = 3;
    add(next, "unconscious");
    return { body: next, text: `Кость ${face}. Три успеха: стабилен, хиты остаются 0, сознание не возвращается.`, blocked: false };
  }
  return {
    body: next,
    text: `Кость ${face}. Успехи ${next.death.success}, провалы ${next.death.fail}. Максимум хитов ${max} в этот бросок не входит.`,
    blocked: false,
  };
}

/** Конец хода снижает испуг на 1. Остальные состояния остаются. */
export function endTurn(body: Body): HarmPreview {
  const next = copy(body);
  const fear = value(next, "frightened");
  if (fear > 0) setValue(next, "frightened", fear - 1);
  const left = next.conditions.filter((id) => id !== "frightened");
  const fearText = fear > 0 ? `Испуг ${fear} стал ${Math.max(0, fear - 1)}.` : "Испуга нет.";
  return {
    body: next,
    text: `${fearText} Остальные состояния на месте${left.length ? `: ${left.join(", ")}` : ""}.`,
    blocked: false,
  };
}
