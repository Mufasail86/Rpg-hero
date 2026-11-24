import type { Character } from "../types";
import { gridDistance, lineOfSight, type BattleMap, type Cell } from "./tactical-map";

export type Light = "bright" | "dim" | "dark";
export type Vision = "normal" | "low-light" | "darkvision";
export interface Environment { light: Light; vision: "character" | Vision; range: number; torch: boolean }
export const DEFAULT_ENVIRONMENT: Environment = { light: "bright", vision: "character", range: 60, torch: false };
export interface Sight { visible: boolean; concealed: boolean; monochrome: boolean; dimPerception: boolean; light: Light; note: string }

export function characterVision(hero: Character): { kind: Vision; range: number } {
  const text = hero.senses.toLowerCase().replace(/ё/g, "е");
  const dark = /темное|ночное|darkvision/.test(text);
  return { kind: dark ? "darkvision" : hero.system === "pf2e" && /сумеречное|low.light/.test(text) ? "low-light" : "normal", range: hero.system === "pf2e" ? Infinity : Number(text.match(/(\d+)\s*(?:фут|фт)/)?.[1] ?? 60) };
}

export function validEnvironment(value: unknown): value is Environment {
  if (!value || typeof value !== "object") return false;
  const row = value as Environment;
  return ["bright", "dim", "dark"].includes(row.light) && ["character", "normal", "low-light", "darkvision"].includes(row.vision) && Number.isInteger(row.range) && row.range >= 5 && row.range <= 300 && typeof row.torch === "boolean";
}

export function sightAt(map: BattleMap, observer: Cell, target: Cell, hero: Character, config = DEFAULT_ENVIRONMENT, torchAt = observer, isHero = true): Sight {
  let light = config.light;
  if (config.torch && lineOfSight(map, torchAt, target).visible) {
    const feet = gridDistance(torchAt, target, hero.system);
    if (feet <= 20) light = "bright";
    else if (feet <= 40 && light === "dark") light = "dim";
  }
  const base = characterVision(hero);
  const vision = isHero ? config.vision === "character" ? base.kind : config.vision : "normal";
  const range = hero.system === "pf2e" ? Infinity : config.vision === "character" ? base.range : config.range;
  const dark = vision === "darkvision" && gridDistance(observer, target, hero.system) <= range;
  const wall = !lineOfSight(map, observer, target).visible;
  const visible = !wall && (light !== "dark" || dark);
  const concealed = visible && hero.system === "pf2e" && light === "dim" && vision === "normal";
  return { visible, concealed, light, monochrome: visible && light === "dark" && dark, dimPerception: hero.system === "dnd5e" && visible && (light === "dim" && !dark || light === "dark"),
    note: wall ? "За стеной" : !visible ? "Не видно в темноте" : concealed ? "Сумрак: чистая проверка СЛ 5" : light === "dark" && dark ? hero.system === "pf2e" ? "Тёмное зрение: чёрно-белое" : "Тёмное зрение: как тусклый свет, без цвета" : light === "dim" && hero.system === "dnd5e" && !dark ? "Сумрак: помеха зрительной Внимательности, не атакам" : "Видно ясно" };
}
