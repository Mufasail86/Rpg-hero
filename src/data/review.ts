import type { ReviewStatus } from "./editions";
import handReviewJson from "./generated/hand-review.json";
import extraLinks from "./generated/links.json";

const handReview = handReviewJson as Record<string, { status: ReviewStatus; checkedOn: string; sourceVersion: string; originalName?: string; location?: string }>;

/**
 * Построчная сверка с открытым справочником 5.2.1, 16 октября 2026.
 * В запись попадает только то, что сверили. Остальной пересказ остаётся pending.
 */
const on = "2026-10-16";
const version = "5.2.1";

function row(status: ReviewStatus, originalName: string, location: string) {
  return { status, checkedOn: on, sourceVersion: version, originalName, location };
}

function pfPartial(originalName: string, location: string) {
  return { status: "verified-partial" as const, checkedOn: on, sourceVersion: "Player Core", originalName, location };
}

const hpOnly = "Поля Foundry: хиты. Остальной пересказ карточки не сверялся.";
const hpSpeed = "Поля Foundry: хиты и скорость. Остальной пересказ карточки не сверялся.";

export const REVIEW: Record<string, { status: ReviewStatus; checkedOn: string; sourceVersion: string; originalName?: string; location?: string }> = {
  ...handReview,
  "dnd-2024~spell~cure-wounds": row("verified-reference", "Cure Wounds", "SRD 5.2.1, заклинание 1-го круга"),
  "dnd-2024~spell~false-life": row("verified-reference", "False Life", "SRD 5.2.1, заклинание 1-го круга"),
  "dnd-2024~condition~exhaustion": row("verified-partial", "Exhaustion", "SRD 5.2.1, словарь состояний"),
  "dnd-2024~item~rope": row("verified-reference", "Rope", "SRD 5.2.1, снаряжение"),
  "dnd-2024~mastery~cleave": row("verified-reference", "Cleave", "SRD 5.2.1, свойства мастерства"),
  "dnd-2024~mastery~graze": row("verified-reference", "Graze", "SRD 5.2.1, свойства мастерства"),
  "dnd-2024~mastery~nick": row("verified-reference", "Nick", "SRD 5.2.1, свойства мастерства"),
  "dnd-2024~mastery~push": row("verified-reference", "Push", "SRD 5.2.1, свойства мастерства"),
  "dnd-2024~mastery~sap": row("verified-reference", "Sap", "SRD 5.2.1, свойства мастерства"),
  "dnd-2024~mastery~slow": row("verified-reference", "Slow", "SRD 5.2.1, свойства мастерства"),
  "dnd-2024~mastery~topple": row("verified-reference", "Topple", "SRD 5.2.1, свойства мастерства"),
  "dnd-2024~mastery~vex": row("verified-reference", "Vex", "SRD 5.2.1, свойства мастерства"),
  "dnd-2024~spell~aid": row("verified-reference", "Aid", "SRD 5.2.1, заклинание 2-го круга"),
  "dnd-2024~spell~hold-person": row("verified-reference", "Hold Person", "SRD 5.2.1, заклинание 2-го круга"),
  "dnd-2024~spell~lesser-restoration": row("verified-reference", "Lesser Restoration", "SRD 5.2.1, заклинание 2-го круга"),
  "dnd-2024~spell~misty-step": row("verified-reference", "Misty Step", "SRD 5.2.1, заклинание 2-го круга"),
  "dnd-2024~spell~fireball": row("verified-reference", "Fireball", "SRD 5.2.1, заклинание 3-го круга"),
  "dnd-2024~spell~revivify": row("verified-reference", "Revivify", "SRD 5.2.1, заклинание 3-го круга"),
  "pf-remaster~versatile-heritage~aiuvarin": { status: "verified-reference", checkedOn: on, sourceVersion: "Player Core", originalName: "Aiuvarin", location: "Ядро игрока, универсальное наследие" },
  "pf-remaster~versatile-heritage~dromaar": { status: "verified-reference", checkedOn: on, sourceVersion: "Player Core", originalName: "Dromaar", location: "Ядро игрока, универсальное наследие" },
  "pf-remaster~versatile-heritage~nephilim": { status: "verified-reference", checkedOn: on, sourceVersion: "Player Core", originalName: "Nephilim", location: "Ядро игрока, универсальное наследие" },
  "pf-remaster~versatile-heritage~changeling": { status: "verified-reference", checkedOn: on, sourceVersion: "Player Core", originalName: "Changeling", location: "Ядро игрока, универсальное наследие" },
  "pf-remaster~versatile-heritage~dhampir": { status: "verified-reference", checkedOn: on, sourceVersion: "Player Core 2", originalName: "Dhampir", location: "Ядро игрока 2, универсальное наследие" },
  "pf-remaster~versatile-heritage~dragonblood": { status: "verified-reference", checkedOn: on, sourceVersion: "Player Core 2", originalName: "Dragonblood", location: "Ядро игрока 2, универсальное наследие" },
  "pf-remaster~versatile-heritage~duskwalker": { status: "verified-reference", checkedOn: on, sourceVersion: "Player Core 2", originalName: "Duskwalker", location: "Ядро игрока 2, универсальное наследие" },
  "pf-remaster~ancestry~dwarf": pfPartial("Dwarf", hpSpeed),
  "pf-remaster~ancestry~elf": pfPartial("Elf", hpSpeed),
  "pf-remaster~ancestry~gnome": pfPartial("Gnome", hpSpeed),
  "pf-remaster~ancestry~goblin": pfPartial("Goblin", hpSpeed),
  "pf-remaster~ancestry~halfling": pfPartial("Halfling", hpSpeed),
  "pf-remaster~ancestry~human": pfPartial("Human", hpSpeed),
  "pf-remaster~ancestry~leshy": pfPartial("Leshy", hpSpeed),
  "pf-remaster~ancestry~orc": pfPartial("Orc", hpSpeed),
  "pf-remaster~class~bard": pfPartial("Bard", hpOnly),
  "pf-remaster~class~cleric": pfPartial("Cleric", hpOnly),
  "pf-remaster~class~druid": pfPartial("Druid", hpOnly),
  "pf-remaster~class~fighter": pfPartial("Fighter", hpOnly),
  "pf-remaster~class~ranger": pfPartial("Ranger", hpOnly),
  "pf-remaster~class~rogue": pfPartial("Rogue", hpOnly),
  "pf-remaster~class~witch": pfPartial("Witch", hpOnly),
  "pf-remaster~class~wizard": pfPartial("Wizard", hpOnly),
  "lore~golarion~golarion": { status: "verified-partial", checkedOn: on, sourceVersion: "community use", originalName: "Golarion", location: "Своя рамка мира и ссылка на политику сообщества. Это не статья вики." },
  "lore~golarion~taldor": { status: "verified-partial", checkedOn: on, sourceVersion: "pathfinderwiki", originalName: "Taldor", location: "Свой пересказ. Столица Оппара подтверждена карточкой города, сверенной 2026-10-16." },
  "lore~golarion~oppara": { status: "verified-reference", checkedOn: on, sourceVersion: "pathfinderwiki", originalName: "Oppara", location: "https://pathfinderwiki.com/wiki/Oppara, сверка 2026-10-16: столица Талдора, крупнейший город, когда-то золотые крыши" },
  "lore~golarion~lion-blades": { status: "verified-reference", checkedOn: on, sourceVersion: "pathfinderwiki", originalName: "Lion Blades", location: "https://pathfinderwiki.com/wiki/Lion_Blades, сверка 2026-10-16: официально организации как будто нет" },
  "lore~golarion~oppara-court": { status: "verified-partial", checkedOn: on, sourceVersion: "gm note", originalName: "Oppara court", location: "Заметка ведущего без факта из вики. Развязку приключения карточка не содержит." },
  "lore~golarion~cheliax": { status: "verified-reference", checkedOn: on, sourceVersion: "pathfinderwiki", originalName: "Cheliax", location: "https://pathfinderwiki.com/wiki/Cheliax, сверка 2026-10-16: военная сила края и проход к Аркадийскому океану" },
  "lore~golarion~andoran": { status: "verified-reference", checkedOn: on, sourceVersion: "pathfinderwiki", originalName: "Andoran", location: "https://pathfinderwiki.com/wiki/Andoran, сверка 2026-10-16: выборы представителей" },
  "lore~golarion~osirion": { status: "verified-reference", checkedOn: on, sourceVersion: "pathfinderwiki", originalName: "Osirion", location: "https://pathfinderwiki.com/wiki/Osirion, сверка 2026-10-16: древняя человеческая страна края" },
  "lore~golarion~varisia": { status: "verified-reference", checkedOn: on, sourceVersion: "pathfinderwiki", originalName: "Varisia", location: "https://pathfinderwiki.com/wiki/Varisia, сверка 2026-10-16: недавно на виду, сердце Тассилона" },
  "lore~golarion~mwangi": { status: "verified-reference", checkedOn: on, sourceVersion: "pathfinderwiki", originalName: "Mwangi Expanse", location: "https://pathfinderwiki.com/wiki/Mwangi_Expanse, сверка 2026-10-16: внутренние земли центра и запада Гарунда" },
  "lore~golarion~sarenrae": { status: "verified-reference", checkedOn: on, sourceVersion: "pathfinderwiki", originalName: "Sarenrae", location: "https://pathfinderwiki.com/wiki/Sarenrae, сверка 2026-10-16: Цветок Рассвета, терпение, искупление" },
  "lore~golarion~iomedae": { status: "verified-reference", checkedOn: on, sourceVersion: "pathfinderwiki", originalName: "Iomedae", location: "https://pathfinderwiki.com/wiki/Iomedae, сверка 2026-10-16: доблесть, справедливость, честь, вестница Ародена" },
  "lore~golarion~desna": { status: "verified-reference", checkedOn: on, sourceVersion: "pathfinderwiki", originalName: "Desna", location: "https://pathfinderwiki.com/wiki/Desna, сверка 2026-10-16: небо и дороги" },
  "lore~golarion~pharasma": { status: "verified-reference", checkedOn: on, sourceVersion: "pathfinderwiki", originalName: "Pharasma", location: "https://pathfinderwiki.com/wiki/Pharasma, сверка 2026-10-16: рождение, смерть, судьба, суд душ" },
  "lore~golarion~absalom": { status: "verified-reference", checkedOn: on, sourceVersion: "pathfinderwiki", originalName: "Absalom", location: "https://pathfinderwiki.com/wiki/Absalom, сверка 2026-10-16: южный берег острова Кортос, крупнейший город края Внутреннего моря" },
  "lore~forgotten-realms~faerun": { status: "verified-partial", checkedOn: on, sourceVersion: "forgottenrealms.fandom", originalName: "Faerûn", location: "Своя рамка материка. Открытый справочник этот мир не описывает." },
  "lore~forgotten-realms~baldurs-gate": { status: "verified-reference", checkedOn: on, sourceVersion: "forgottenrealms.fandom", originalName: "Baldur's Gate", location: "https://forgottenrealms.fandom.com/wiki/Baldur%27s_Gate, сверка 2026-10-16: побережье мечей, западные земли сердца" },
  "lore~forgotten-realms~silverymoon": { status: "verified-reference", checkedOn: on, sourceVersion: "forgottenrealms.fandom", originalName: "Silverymoon", location: "https://forgottenrealms.fandom.com/wiki/Silverymoon, сверка 2026-10-16: приветливый город, сияющие башни" },
  "lore~forgotten-realms~cormyr": { status: "verified-reference", checkedOn: on, sourceVersion: "forgottenrealms.fandom", originalName: "Cormyr", location: "https://forgottenrealms.fandom.com/wiki/Cormyr, сверка 2026-10-16: столица Сюзейл, внутренний Фаэрун" },
  "lore~forgotten-realms~icewind-dale": { status: "verified-reference", checkedOn: on, sourceVersion: "forgottenrealms.fandom", originalName: "Icewind Dale", location: "https://forgottenrealms.fandom.com/wiki/Icewind_Dale, сверка 2026-10-16: союз поселений, вывоз форели и резьбы" },
  "lore~forgotten-realms~underdark": { status: "verified-reference", checkedOn: on, sourceVersion: "forgottenrealms.fandom", originalName: "Underdark", location: "https://forgottenrealms.fandom.com/wiki/Underdark, сверка 2026-10-16: подземная сеть, дроу, дуэргары, свирфнеблины" },
  "lore~forgotten-realms~neverwinter": { status: "verified-reference", checkedOn: on, sourceVersion: "wikipedia", originalName: "Neverwinter", location: "Сверка 2026-10-16: город-государство на северо-западном берегу Фаэруна" },
  "lore~forgotten-realms~waterdeep": { status: "verified-reference", checkedOn: on, sourceVersion: "forgottenrealms.fandom", originalName: "Waterdeep", location: "https://forgottenrealms.fandom.com/wiki/Waterdeep, сверка 2026-10-16: север побережья мечей, северо-запад Фаэруна, глубокая гавань" },
  "lore~srd~open-srd": { status: "verified-reference", checkedOn: on, sourceVersion: "SRD page", originalName: "System Reference Document", location: "https://www.dndbeyond.com/srd, сверка 2026-10-16: справочник — правила; Забытые королевства в таблицу справочника не входят; приложение про планы убрано как не правила" },
};

/** Связь между записями разных редакций. Оба конца должны уже лежать в каталоге. */
export const LINKS: { from: string; to: string; note: string }[] = extraLinks;
