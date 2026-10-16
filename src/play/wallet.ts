import { emptyCoins, type Coins } from "../types";

const WORTH: Record<keyof Coins, number> = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };

const WORD: Record<string, keyof Coins> = {
  мм: "cp",
  см: "sp",
  эм: "ep",
  зм: "gp",
  пм: "pp",
  cp: "cp",
  sp: "sp",
  ep: "ep",
  gp: "gp",
  pp: "pp",
};

const NAME: Record<keyof Coins, string> = {
  cp: "мм",
  sp: "см",
  ep: "эм",
  gp: "зм",
  pp: "пм",
};

/** Сумма только в целых медных. Дробей нет. */
export function totalCopper(coins: Coins): number {
  return coins.cp * WORTH.cp + coins.sp * WORTH.sp + coins.ep * WORTH.ep + coins.gp * WORTH.gp + coins.pp * WORTH.pp;
}

export function coinPieces(coins: Coins): number {
  return coins.cp + coins.sp + coins.ep + coins.gp + coins.pp;
}

/** 1000 монет = 1 объём. 999 монет объёма не дают. */
export function pfCoinBulk(coins: Coins): number {
  return Math.floor(coinPieces(coins) / 1000);
}

/** 50 монет = 1 фунт. Остаток фунтом не считается. */
export function dndCoinPounds(coins: Coins): { pounds: number; leftover: number } {
  const pieces = coinPieces(coins);
  return { pounds: Math.floor(pieces / 50), leftover: pieces % 50 };
}

export function parsePurse(text: string): Coins | { error: string } {
  const raw = text.trim().toLowerCase();
  if (!raw) return { error: "Введите сумму, например 2 зм 5 см." };
  if (/[.,]\d/.test(raw)) return { error: "Дроби в монетах не используются. Пишите целые мм, см, эм, зм и пм." };
  const coins = emptyCoins();
  const pattern = /(\d+)\s*(пм|зм|эм|см|мм|pp|gp|ep|sp|cp)/g;
  let found = false;
  for (const match of raw.matchAll(pattern)) {
    found = true;
    const key = WORD[match[2]];
    coins[key] += Number(match[1]);
  }
  if (!found) return { error: "Нужны целые монеты: 2 зм 5 см." };
  return coins;
}

export function formatCoins(coins: Coins): string {
  const parts = (Object.keys(NAME) as (keyof Coins)[])
    .filter((key) => coins[key] > 0)
    .map((key) => `${coins[key]} ${NAME[key]}`);
  return parts.length ? parts.join(" ") : "0 мм";
}

export function exchange(
  coins: Coins,
  from: keyof Coins,
  to: keyof Coins,
  count: number,
): { ok: true; coins: Coins; preview: string } | { ok: false; error: string } {
  if (!Number.isInteger(count) || count < 1) return { ok: false, error: "Размен считает целые монеты." };
  if (from === to) return { ok: false, error: "Выберите другую монету." };
  if (coins[from] < count) return { ok: false, error: "Этих монет не хватает." };
  const value = count * WORTH[from];
  if (value % WORTH[to] !== 0) return { ok: false, error: "Так нацело не разменять. Возьмите другую пару." };
  const got = value / WORTH[to];
  const next = { ...coins, [from]: coins[from] - count, [to]: coins[to] + got };
  return { ok: true, coins: next, preview: `${count} ${NAME[from]} станут ${got} ${NAME[to]}. Сумма в меди не меняется: ${totalCopper(next)} мм.` };
}

function exactPay(coins: Coins, price: number): Coins | null {
  const next = { ...coins };
  let left = price;
  for (const key of ["cp", "sp", "ep", "gp", "pp"] as const) {
    const use = Math.min(next[key], Math.floor(left / WORTH[key]));
    next[key] -= use;
    left -= use * WORTH[key];
  }
  return left === 0 ? next : null;
}

function payByBreaking(coins: Coins, price: number): { coins: Coins; change: number } | null {
  if (totalCopper(coins) < price) return null;
  const next = { ...coins };
  let gathered = 0;
  for (const key of ["pp", "gp", "ep", "sp", "cp"] as const) {
    while (next[key] > 0 && gathered < price) {
      next[key] -= 1;
      gathered += WORTH[key];
    }
  }
  const change = gathered - price;
  next.cp += change;
  return { coins: next, change };
}

/** Оплата не разменивает сама. Сдача — отдельное согласие. */
export function pay(
  coins: Coins,
  priceCopper: number,
  allowChange: boolean,
): { ok: true; coins: Coins; preview: string } | { ok: false; error: string; needExchange: boolean } {
  if (!Number.isInteger(priceCopper) || priceCopper < 0) return { ok: false, error: "Цена должна быть целым числом медных.", needExchange: false };
  if (priceCopper === 0) return { ok: true, coins: { ...coins }, preview: "Цена 0. Кошелёк не тронут." };
  if (totalCopper(coins) < priceCopper) {
    return { ok: false, error: `Не хватает ${priceCopper - totalCopper(coins)} мм. Покупка не проходит.`, needExchange: false };
  }
  const exact = exactPay(coins, priceCopper);
  if (exact) return { ok: true, coins: exact, preview: `Точная оплата ${priceCopper} мм. Сдачи нет. Останется ${formatCoins(exact)}.` };
  if (!allowChange) {
    return { ok: false, error: "Точными монетами не набрать. Разменять и дать сдачу?", needExchange: true };
  }
  const broken = payByBreaking(coins, priceCopper);
  if (!broken) return { ok: false, error: "Оплатить нечем.", needExchange: false };
  return {
    ok: true,
    coins: broken.coins,
    preview: `С разбором монет. Сдача ${broken.change} мм. Останется ${formatCoins(broken.coins)}.`,
  };
}
