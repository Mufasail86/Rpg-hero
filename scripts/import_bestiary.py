#!/usr/bin/env python3
"""Снимает числа бестиария с Foundry Monster Core (ORC) и PDF SRD 5.2.1 / 5.1.

В карточку попадает русский блок: подписи свои, числа — из полей источника.
Английский абзац книги не копируется. Пометка лицензии остаётся английской
на экране, не в этом файле данных.
"""
from __future__ import annotations

import json
import re
import unicodedata
from html import unescape
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "data" / "generated"
MC = Path("/tmp/pf2e/packs/pf2e/pathfinder-monster-core")
PDF52 = Path("/tmp/sources/srd-5.2.1.pdf")
PDF51 = Path("/tmp/sources/srd-5.1.pdf")
CHECKED = "2026-10-17"

SIZE_RU = {
    "tiny": "крошечный",
    "sm": "малый",
    "small": "малый",
    "med": "средний",
    "medium": "средний",
    "lg": "крупный",
    "large": "крупный",
    "huge": "огромный",
    "grg": "исполинский",
    "gargantuan": "исполинский",
}
RARITY_RU = {"common": "обычный", "uncommon": "необычный", "rare": "редкий", "unique": "уникальный"}
SPEED_RU = {
    "burrow": "рытьё",
    "climb": "лазание",
    "fly": "полёт",
    "swim": "плавание",
    "land": "ходьба",
}
DMG_RU = {
    "bludgeoning": "дробящий",
    "piercing": "колющий",
    "slashing": "рубящий",
    "fire": "огонь",
    "cold": "холод",
    "electricity": "электричество",
    "acid": "кислота",
    "poison": "яд",
    "mental": "ментальный",
    "sonic": "звук",
    "force": "силовой",
    "vitality": "жизненная сила",
    "void": "пустота",
    "spirit": "дух",
    "bleed": "кровотечение",
    "precision": "точный",
    "positive": "положительный",
    "negative": "отрицательный",
    "untyped": "без типа",
    "physical": "физический",
}
TRAIT_RU = {
    "agile": "быстрое",
    "finesse": "фехтовальное",
    "reach": "досягаемость",
    "unarmed": "безоружное",
    "magical": "магическое",
    "brutal": "жестокое",
    "deadly": "смертельное",
    "backstabber": "удар в спину",
    "goblin": "гоблинское",
    "humanoid": "гуманоид",
    "dragon": "дракон",
    "primal": "первозданный",
    "arcane": "арканный",
    "divine": "божественный",
    "occult": "оккультный",
    "animal": "животное",
    "beast": "зверь",
    "undead": "нежить",
    "fiend": "исчадие",
    "construct": "конструкт",
    "elemental": "элементаль",
    "fey": "фея",
    "aberration": "аберрация",
    "plant": "растение",
    "ooze": "слизь",
    "giant": "великан",
    "monitor": "наблюдатель",
    "spirit": "дух",
    "fungus": "гриб",
    "astral": "астральный",
    "cold": "холод",
    "fire": "огонь",
    "acid": "кислота",
    "electricity": "электричество",
    "poison": "яд",
    "mental": "ментальный",
    "emotion": "эмоция",
    "fear": "страх",
    "aura": "аура",
    "attack": "атака",
    "concentrate": "концентрация",
    "manipulate": "манипуляция",
    "move": "движение",
    "visual": "зрение",
    "auditory": "слух",
    "olfactory": "запах",
    "incapacitation": "недееспособность",
    "death": "смерть",
    "healing": "лечение",
    "teleportation": "телепортация",
    "uncommon": "необычное",
    "rare": "редкое",
    "unique": "уникальное",
    "common": "обычное",
    "amphibious": "земноводный",
    "aquatic": "водный",
    "swarm": "рой",
    "troop": "отряд",
    "mindless": "без разума",
    "incorporeal": "бестелесный",
    "holy": "святой",
    "unholy": "нечестивый",
    "good": "добрый",
    "evil": "злой",
    "chaotic": "хаотичный",
    "lawful": "законный",
    "neutral": "нейтральный",
    "paralyzed": "паралич",
    "petrified": "окаменение",
    "sleep": "сон",
    "unconscious": "без сознания",
    "disease": "болезнь",
    "adamantine": "адамантин",
    "sonic": "звук",
    "fear": "страх",
}
SENSE_RU = {
    "darkvision": "тёмное зрение",
    "low-light-vision": "сумеречное зрение",
    "greaterDarkvision": "улучшенное тёмное зрение",
    "lowLightVision": "сумеречное зрение",
    "scent": "нюх",
    "tremorsense": "чувство вибрации",
    "wavesense": "чувство волн",
    "lifesense": "чувство жизни",
    "thoughtsense": "чувство мысли",
    "echolocation": "эхолокация",
    "seeInvisibility": "видение невидимого",
}
LANG_RU = {
    "common": "всеобщий",
    "goblin": "гоблинский",
    "draconic": "драконий",
    "fey": "фейский",
    "elven": "эльфийский",
    "dwarven": "дварфийский",
    "orcish": "орочий",
    "gnomish": "гномий",
    "halfling": "полуросликовый",
    "aklo": "акло",
    "jotun": "ётун",
    "taldane": "тальданский",
    "varisian": "варисийский",
    "mwangi": "мванги",
    "osiriani": "осирианский",
    "kelish": "келийский",
    "hallit": "халлит",
    "shoanti": "шоанти",
    "skald": "скальдский",
    "tien": "тьен",
    "utopian": "утопический",
    "infernal": "инфернальный",
    "celestial": "небесный",
    "abyssal": "бездонный",
    "necril": "некрил",
    "shadowtongue": "теневой",
    "empyrean": "эмпирейский",
    "pyric": "пирийский",
    "sussuran": "суссуран",
    "thalassic": "талассический",
    "chthonian": "хтонийский",
    "diabolic": "дьявольский",
    "daemonic": "демонический",
    "petran": "петран",
    "talican": "таликанский",
    "wildsong": "дикая песнь",
}
SKILL_RU = {
    "acrobatics": "Акробатика",
    "arcana": "Аркана",
    "athletics": "Атлетика",
    "crafting": "Ремесло",
    "deception": "Обман",
    "diplomacy": "Дипломатия",
    "intimidation": "Запугивание",
    "medicine": "Медицина",
    "nature": "Природа",
    "occultism": "Оккультизм",
    "performance": "Выступление",
    "religion": "Религия",
    "society": "Общество",
    "stealth": "Скрытность",
    "survival": "Выживание",
    "thievery": "Воровство",
}
AB_RU = {"str": "Сил", "dex": "Лов", "con": "Тел", "int": "Инт", "wis": "Мдр", "cha": "Хар"}
GLOSSARY_RU = {
    "AllAroundVision": "Видит во все стороны сразу и не получает застигнутость врасплох от фланга.",
    "AquaticAmbush": "Прячется в воде. Когда незаметившее его существо оказывается в указанной дистанции, плывёт к нему на скорость плавания + 10 футов и бьёт. Цель застигнута врасплох против этого удара.",
    "AttackOfOpportunity": "Реакция: существо в досягаемости манипулирует, двигается, стреляет или покидает клетку. Удар ближнего боя. Штраф нескольких атак на этот удар не действует и от него не растёт. Крит по манипуляции срывает действие.",
    "AtWillSpells": "Заклинания «по желанию» можно творить сколько угодно, ячейки не тратятся.",
    "Aura": "Аура действует сама в указанном радиусе. Если она только наносит урон, существо получает его при входе и в начале своего хода, не чаще одного раза за раунд.",
    "Buck": "Реакция, когда наездник садится или командует животным. Рефлекс против указанной СЛ, иначе падение и лежачее положение. Крит провал ещё и 1d6 дробящего сверх урона падения.",
    "CatchRock": "Нужна свободная рука. Реакция на брошенный или падающий камень: +4 обстоятельственных к защите. При успехе камень пойман, урона нет.",
    "ChangeFormation": "Отряд меняет строй. Свободный строй глушит слабости к площади и брызгам, но чужие спасброски против урона отряда на ступень лучше. Походная колонна: +10 футов к скоростям, застигнут врасплох и −2 к рефлексу.",
    "ChangeShape": "Меняет облик, пока не сменит снова. Это маскировка для Обмана: +4 статусных к СЛ обмана против разоблачения. Особых способностей нового облика не получает.",
    "ConstantSpells": "Постоянное заклинание действует без сотворения. Если его сняли, существо может включить его снова обычными действиями сотворения.",
    "Constrict": "Урон указанной кости всем схваченным или обездвиженным. Чистая стойкость по указанной СЛ.",
    "Coven": "Может войти в ковен с двумя другими существами с этой способностью после обряда в 8 часов. Участники получают элитную поправку. Общие заклинания ковена творят трое в 30 футах друг от друга.",
    "Darkvision": "Тёмное зрение: в темноте и сумраке видит чёрно-белым. Обычную магическую тьму 4 круга не пробивает.",
    "Disease": "При контакте стойкость, иначе болезнь. Круг болезни равен уровню существа. Дальше правила недугов.",
    "Engulf": "Шагает до двойной скорости и проходит сквозь клетки. Существа его размера и меньше проходят рефлекс по указанной СЛ, иначе их затягивает внутрь.",
    "FastHealing": "В начале хода восстанавливает указанное число хитов.",
    "Ferocity": "Реакция при падении до 0 хитов: остаётся на 1 хите, ранение +1. При ранении 3 больше не срабатывает.",
    "FormUp": "Отряд перестраивает свои клетки в связную фигуру в 15 футах от выбранной клетки.",
    "FrightfulPresence": "Кто впервые входит в область, проходит волю. Крит — ничего. Успех — испуг 1. Провал — испуг 2. Крит провал — испуг 4. После броска иммунитет на 1 минуту.",
    "GolemAntimagic": "Голем не подвержен чужим заклинаниям, кроме перечисленных исключений. «Вредит» заменяет эффект указанным уроном без типа. «Лечит» лечит вместо обычного эффекта.",
    "Grab": "После успешного удара, где в уроне указан захват, пытается схватить той же частью тела. Штраф нескольких атак не применяется. Можно продлить уже существующий захват до конца следующего хода.",
    "GreaterConstrict": "Как сдавливание, и провал стойкости ещё и лишает сознания. Успех даёт иммунитет к этой потере сознания на 1 минуту.",
    "GreaterDarkvision": "Видит в темноте, сумраке и даже в магической тьме, чёрно-белым.",
    "Hover": "Наземная скорость — это парение в 5 футах от твёрдой поверхности, не полёт.",
    "ImprovedGrab": "Как захват, но при успехе цель обездвижена, пока не вырвется.",
    "ImprovedKnockdown": "Как сбивание, но при успехе цель лежит и не может встать, пока не вырвется из захвата, если захват тоже есть.",
    "ImprovedPush": "Как толчок, но при успехе цель ещё и лежит.",
    "Knockdown": "После успешного удара, где указано сбивание, пытается уронить цель. Штраф нескольких атак не применяется.",
    "Lifesense": "Чувствует жизненную и пустотную искру живых и нежити в указанной дистанции.",
    "LightBlindness": "Первый яркий свет ослепляет до конца следующего хода. Пока стоит в ярком свете, ослеплён светом. После часа в темноте вспышка снова ослепляет.",
    "LowLightVision": "Сумрак для него как яркий свет. Скрытость от сумрака не действует.",
    "NegativeHealing": "Лечится пустотой и получает урон от жизненной силы. Пустотный урон ему не вредит.",
    "NoBreath": "Не дышит и не подвержен эффектам, которым нужно дыхание.",
    "Poison": "При контакте стойкость, иначе яд. Круг яда равен уровню существа.",
    "PowerAttack": "Раз в раунд удар, который считается двумя атаками для штрафа нескольких атак. Попадание добавляет ещё одну кость урона оружия.",
    "Pull": "После успешного удара с притягиванием пытается притянуть цель ближе. Штраф нескольких атак не применяется.",
    "Push": "После успешного удара с толчком пытается толкнуть. Штраф нескольких атак не применяется. Если указана дистанция, успех толкает на неё.",
    "ReactiveStrike": "Реакция на манипуляцию, движение, дальнюю атаку или уход из клетки в досягаемости. Удар ближнего боя вне штрафа нескольких атак. Крит срывает манипуляцию.",
    "Regeneration": "В начале хода возвращает указанные хиты. Умирание не растёт выше 3, пока регенерация жива. Урон указанного типа гасит её до конца следующего хода.",
    "Rend": "Если в этом раунде дважды попал по одной цели указанным ударом, автоматически наносит урон этого удара ещё раз.",
    "RetributiveStrike": "Реакция, когда враг ранит союзника и оба в 15 футах. Союзник получает сопротивление всему урону этого удара, равное 2 + уровень. Если враг в досягаемости, ответный удар.",
    "Scent": "Нюх, обычно неточный. Дистанция в записи. Без запаха, как у бестелесного, не работает.",
    "ShieldBlock": "Реакция при поднятом щите: снижает физический урон на твёрдость щита. Остаток делят существо и щит.",
    "SneakAttack": "Удар по застигнутому врасплох быстрым или фехтовальным оружием, безоружной атакой или дальним оружием добавляет указанный точный урон.",
    "Stench": "Кто входит в ауру или начинает там ход, проходит стойкость или получает тошноту 1. Крит провал ещё и замедление 1, пока тошнит. Успех или снятие тошноты дают иммунитет к вони на 1 минуту.",
    "SwallowWhole": "Пытается проглотить схваченное существо не крупнее указанного размера: Атлетика против рефлекса цели. Проглоченный внутри получает указанный урон. Разрыв указанной твёрдости выпускает его.",
    "SwarmMind": "Нет одного разума. Иммунитет к ментальным эффектам, которые бьют по ограниченному числу существ. Площадные ментальные эффекты действуют.",
    "Telepathy": "Мысленная речь в указанном радиусе с тем, с кем есть общий язык. Мысли не читает.",
    "Thoughtsense": "Чувствует всех, у кого есть разум, в указанной дистанции.",
    "ThrowRock": "Поднимает камень в досягаемости или достаёт запасной и делает дальний удар.",
    "Trample": "Шагает до двойной скорости сквозь клетки существ указанного размера. Урон указанного удара, чистый рефлекс по указанной СЛ.",
    "Tremorsense": "Неточное чувство вибрации по твёрдой поверхности. Работает, только если существо и цель на одной поверхности и цель движется.",
    "TroopDefenses": "Отряд — четыре клетки по 10 футов, они должны соприкасаться стороной. Два порога хитов снимают клетки, обычно на 2/3 и 1/3 максимума.",
    "TroopMovement": "Двигается одна клетка отряда, остальные следуют и не обгоняют её.",
    "Wavesense": "Неточное чувство движения в одной с существом жидкости.",
    "WindUp": "Заводной механизм заводят ключом 1 минуту. Потом он работает указанное время, обычно 24 часа, и останавливается.",
}

NAME_RU = {
    "goblin": "гоблин",
    "warrior": "воин",
    "minion": "прислужник",
    "boss": "главарь",
    "captain": "капитан",
    "commando": "коммандо",
    "pyro": "огнеметчик",
    "warchanter": "военный певец",
    "dragon": "дракон",
    "adult": "взрослый",
    "ancient": "древний",
    "young": "молодой",
    "wyrmling": "змеёныш",
    "spellcaster": "заклинатель",
    "adamantine": "адамантиновый",
    "red": "красный",
    "blue": "синий",
    "black": "чёрный",
    "green": "зелёный",
    "white": "белый",
    "gold": "золотой",
    "silver": "серебряный",
    "bronze": "бронзовый",
    "brass": "латунный",
    "copper": "медный",
    "wolf": "волк",
    "dire": "лютый",
    "bear": "медведь",
    "boar": "кабан",
    "rat": "крыса",
    "giant": "гигантский",
    "ogre": "огр",
    "troll": "тролль",
    "skeleton": "скелет",
    "zombie": "зомби",
    "ghoul": "упырь",
    "ghost": "привидение",
    "vampire": "вампир",
    "spawn": "отродье",
    "familiar": "фамильяр",
    "mastermind": "интриган",
    "elemental": "элементаль",
    "fire": "огня",
    "water": "воды",
    "air": "воздуха",
    "earth": "земли",
    "hound": "гончая",
    "hell": "адская",
    "imp": "бес",
    "demon": "демон",
    "devil": "дьявол",
    "angel": "ангел",
    "golem": "голем",
    "flesh": "плоти",
    "stone": "камня",
    "iron": "железа",
    "clay": "глины",
    "animated": "оживший",
    "armor": "доспех",
    "sword": "меч",
    "flying": "летающий",
    "swarm": "рой",
    "spider": "паук",
    "snake": "змея",
    "venomous": "ядовитый",
    "constrictor": "удав",
    "crocodile": "крокодил",
    "shark": "акула",
    "hunter": "охотник",
    "reef": "рифовая",
    "killer": "касатка",
    "whale": "кит",
    "horse": "лошадь",
    "warhorse": "боевой конь",
    "riding": "верховая",
    "draft": "тяжеловоз",
    "pony": "пони",
    "mule": "мул",
    "camel": "верблюд",
    "elephant": "слон",
    "mammoth": "мамонт",
    "lion": "лев",
    "tiger": "тигр",
    "panther": "пантера",
    "hyena": "гиена",
    "jackal": "шакал",
    "ape": "обезьяна",
    "baboon": "бабуин",
    "badger": "барсук",
    "bat": "летучая мышь",
    "hawk": "ястреб",
    "eagle": "орёл",
    "owl": "сова",
    "raven": "ворон",
    "vulture": "стервятник",
    "frog": "лягушка",
    "toad": "жаба",
    "crab": "краб",
    "scorpion": "скорпион",
    "centipede": "сороконожка",
    "wasp": "оса",
    "beetle": "жук",
    "insect": "насекомых",
    "insects": "насекомых",
    "piranha": "пиранья",
    "piranhas": "пираний",
    "octopus": "осьминог",
    "seahorse": "морской конёк",
    "deer": "олень",
    "elk": "лось",
    "goat": "козёл",
    "cat": "кошка",
    "dog": "пёс",
    "mastiff": "мастиф",
    "weasel": "ласка",
    "lizard": "ящерица",
    "stirge": "стирж",
    "wight": "умертвие",
    "wraith": "призрачный ужас",
    "specter": "спектр",
    "shadow": "тень",
    "lich": "лич",
    "mummy": "мумия",
    "lord": "владыка",
    "medusa": "медуза",
    "minotaur": "минотавр",
    "hydra": "гидра",
    "kraken": "кракен",
    "tarrasque": "тарраск",
    "aboleth": "аболеф",
    "ankheg": "анхег",
    "assassin": "убийца",
    "basilisk": "василиск",
    "behir": "бехир",
    "bulette": "буллет",
    "chimera": "химера",
    "chuul": "чуул",
    "cloaker": "плащевик",
    "cockatrice": "кокатрис",
    "couatl": "куатль",
    "darkmantle": "тёмная мантия",
    "doppelganger": "двойник",
    "drider": "дридер",
    "dryad": "дриада",
    "ettercap": "эттеркап",
    "ettin": "эттин",
    "gargoyle": "горгулья",
    "gelatinous": "желатиновый",
    "cube": "куб",
    "ghast": "гаст",
    "gibbering": "бормочущий",
    "mouther": "глотка",
    "gnoll": "гнолл",
    "gorgon": "горгона",
    "grick": "грик",
    "griffon": "грифон",
    "grimlock": "гримлок",
    "harpy": "гарпия",
    "hippogriff": "гиппогриф",
    "hobgoblin": "хобгоблин",
    "homunculus": "гомункул",
    "invisible": "невидимый",
    "stalker": "охотник",
    "knight": "рыцарь",
    "kobold": "кобольд",
    "lamia": "ламия",
    "lemure": "лемур",
    "mage": "маг",
    "archmage": "архимаг",
    "magmin": "магмин",
    "manticore": "мантикора",
    "mimic": "мимик",
    "naga": "нага",
    "guardian": "страж",
    "spirit": "дух",
    "nightmare": "кошмар",
    "noble": "дворянин",
    "ochre": "охряная",
    "jelly": "медуза-слизь",
    "oni": "они",
    "otyugh": "отиуг",
    "owlbear": "совомед",
    "pegasus": "пегас",
    "phase": "фазовый",
    "pirate": "пират",
    "priest": "жрец",
    "acolyte": "послушник",
    "pseudodragon": "псевдодракон",
    "purple": "пурпурный",
    "worm": "червь",
    "quasit": "квазит",
    "rakshasa": "ракшас",
    "remorhaz": "ремораз",
    "roc": "рок",
    "roper": "ропер",
    "rust": "ржавый",
    "monster": "монстр",
    "sahuagin": "сахуагин",
    "salamander": "саламандра",
    "satyr": "сатир",
    "scout": "разведчик",
    "hag": "ведьма",
    "sea": "морская",
    "shambling": "шагающий",
    "mound": "холм",
    "shield": "щит",
    "sphinx": "сфинкс",
    "wonder": "чуда",
    "lore": "знания",
    "valor": "доблести",
    "sprite": "спрайт",
    "spy": "шпион",
    "storm": "штормовой",
    "cloud": "облачный",
    "hill": "холмовой",
    "frost": "морозный",
    "succubus": "суккуб",
    "incubus": "инкуб",
    "treant": "трен",
    "unicorn": "единорог",
    "werebear": "медведь-оборотень",
    "wereboar": "кабан-оборотень",
    "wererat": "крысолак",
    "weretiger": "тигр-оборотень",
    "werewolf": "вервольф",
    "worg": "ворг",
    "wyvern": "виверна",
    "xorn": "ксорн",
    "bandit": "разбойник",
    "berserker": "берсерк",
    "commoner": "простолюдин",
    "cultist": "культист",
    "fanatic": "фанатик",
    "druid": "друид",
    "gladiator": "гладиатор",
    "guard": "страж",
    "tough": "громила",
    "veteran": "ветеран",
    "infantry": "пехотинец",
    "warrior": "воин",
    "bugbear": "багбир",
    "djinni": "джинн",
    "efreeti": "ифрит",
    "deva": "дева",
    "planetar": "планетар",
    "solar": "солар",
    "balor": "балор",
    "glabrezu": "глабрезу",
    "hezrou": "хезру",
    "marilith": "марилита",
    "nalfeshnee": "налфешни",
    "vrock": "врок",
    "dretch": "дреч",
    "pit": "ямный",
    "fiend": "исчадие",
    "barbed": "шипастый",
    "bearded": "бородатый",
    "bone": "костяной",
    "chain": "цепной",
    "horned": "рогатый",
    "ice": "ледяной",
    "erinyes": "эриния",
    "mephit": "мефит",
    "dust": "пыли",
    "magma": "магмы",
    "steam": "пара",
    "merfolk": "мерфолк",
    "skirmisher": "застрельщик",
    "merrow": "мерроу",
    "half-dragon": "полудракон",
    "death": "смерти",
    "blink": "мерцающий",
    "dog": "пёс",
    "axe": "топоро",
    "beak": "клюв",
    "azer": "азер",
    "sentinel": "страж",
    "awakened": "пробуждённый",
    "shrub": "куст",
    "tree": "дерево",
    "plant": "растение",
    "plants": "растения",
    "fungus": "гриб",
    "fungi": "грибы",
    "shrieker": "крикун",
    "violet": "фиолетовый",
    "ooze": "слизь",
    "gray": "серая",
    "black": "чёрный",
    "pudding": "пудинг",
    "rug": "ковёр",
    "smothering": "удушающий",
    "object": "предмет",
    "objects": "предметы",
    "crawling": "ползающий",
    "claw": "коготь",
    "claws": "когти",
    "limb": "конечность",
    "allosaurus": "аллозавр",
    "ankylosaurus": "анкилозавр",
    "archelon": "архелон",
    "plesiosaurus": "плезиозавр",
    "pteranodon": "птеранодон",
    "triceratops": "трицератопс",
    "tyrannosaurus": "тираннозавр",
    "rex": "рекс",
    "hippopotamus": "бегемот",
    "rhinoceros": "носорог",
    "saber-toothed": "саблезубый",
    "polar": "полярный",
    "brown": "бурый",
    "blood": "кровавый",
    "constrictor": "удав",
    "draft": "тяжеловоз",
    "flying": "летающий",
    "giant": "гигантский",
    "of": "",
    "the": "",
    "a": "",
    "and": "и",
    "swarm": "рой",
}


def slug(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = text.lower().replace("'", "").replace("’", "")
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "creature"


def ru_phrase(name: str) -> str:
    cleaned = name.replace("(", " (").replace(")", ") ")
    parts = re.findall(r"[A-Za-z][A-Za-z'’\-]*|\([^)]+\)", cleaned)
    out = []
    for part in parts:
        if part.startswith("("):
            inner = ru_phrase(part[1:-1])
            out.append(f"({inner})")
            continue
        key = part.lower().replace("’", "'")
        if key in NAME_RU and NAME_RU[key]:
            out.append(NAME_RU[key])
        else:
            out.append(translit(part))
    text = " ".join(out)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:1].upper() + text[1:] if text else name


def translit(word: str) -> str:
    table = {
        "shch": "щ", "sch": "щ", "yo": "ё", "zh": "ж", "kh": "х", "ch": "ч", "sh": "ш",
        "yu": "ю", "ya": "я", "ye": "е", "th": "т", "ph": "ф",
    }
    lower = word.lower()
    i = 0
    out = []
    singles = {
        "a": "а", "b": "б", "c": "к", "d": "д", "e": "е", "f": "ф", "g": "г", "h": "х",
        "i": "и", "j": "дж", "k": "к", "l": "л", "m": "м", "n": "н", "o": "о", "p": "п",
        "q": "к", "r": "р", "s": "с", "t": "т", "u": "у", "v": "в", "w": "в", "x": "кс",
        "y": "и", "z": "з",
    }
    while i < len(lower):
        hit = False
        for n in (4, 3, 2):
            chunk = lower[i:i + n]
            if chunk in table:
                out.append(table[chunk])
                i += n
                hit = True
                break
        if hit:
            continue
        out.append(singles.get(lower[i], lower[i]))
        i += 1
    text = "".join(out)
    return text[:1].upper() + text[1:] if word[:1].isupper() else text


def signed(n: int) -> str:
    return f"+{n}" if n >= 0 else str(n)


def trait_ru(raw: str) -> str:
    if raw.startswith("reach-"):
        return f"досягаемость {raw.split('-', 1)[1]} футов"
    if raw.startswith("deadly-"):
        return f"смертельное {raw.split('-', 1)[1]}"
    if raw.startswith("reload-"):
        return f"перезарядка {raw.split('-', 1)[1]}"
    if raw.startswith("versatile-"):
        return f"универсальное {DMG_RU.get(raw.split('-', 1)[1], raw.split('-', 1)[1])}"
    return TRAIT_RU.get(raw, TRAIT_RU.get(raw.split("-")[0], raw))


CREATURE_KINDS = (
    "aberration", "animal", "beast", "celestial", "construct", "dragon", "elemental",
    "fey", "fiend", "fungus", "giant", "humanoid", "monitor", "ooze", "plant", "spirit", "undead",
)


def creature_kind(trait_ids: list[str]) -> str:
    for kind in CREATURE_KINDS:
        if kind in trait_ids:
            return trait_ru(kind)
    return "существо"


PHRASES = [
    ("ends a move action", "заканчивает действие движения"),
    ("move action", "действие движения"),
    ("adjacent to", "рядом с"),
    ("goblin ally", "союзник-гоблин"),
    ("goblin warrior", "гоблин-воин"),
    ("fewer than half their Hit Points", "хиты ниже половины"),
    ("their resistance is reduced by", "сопротивление уменьшается на"),
    ("circumstance bonus to their Speeds", "бонус обстоятельства к скорости"),
    ("unarmed melee Strikes", "безоружные удары ближнего боя"),
    ("melee Strike", "удар ближнего боя"),
    ("critical hit", "критическое попадание"),
    ("critically hit", "получает критическое попадание"),
    ("normal hit", "обычное попадание"),
    ("can't use", "не может применить"),
    ("again for", "снова раньше чем через"),
    ("in any order", "в любом порядке"),
    ("within reach", "в досягаемости"),
    ("solid stone", "твёрдый камень"),
    ("The dragon", "Дракон"),
    ("the dragon", "дракон"),
    ("The goblin", "Гоблин"),
    ("the goblin", "гоблин"),
    ("A goblin", "Гоблин"),
]
WORDS = {
    "ally": "союзник", "ends": "заканчивает", "adjacent": "рядом", "steps": "шаг", "step": "шаг",
    "strides": "перемещение", "stride": "перемещение", "strikes": "удары", "strike": "удар",
    "dragon": "дракон", "weapon": "оружие", "attack": "атака", "attacks": "атаки",
    "creature": "существо", "creatures": "существа", "target": "цель", "damage": "урона",
    "bonus": "бонус", "resistance": "сопротивление", "speed": "скорость", "speeds": "скорости",
    "and": "и", "or": "или", "with": "с", "when": "когда", "if": "если", "then": "затем",
    "against": "против", "must": "должен", "can": "может", "cannot": "не может",
    "success": "успех", "failure": "провал", "half": "половина", "reduced": "уменьшен",
    "gains": "получает", "gain": "получает", "burrow": "рытьё", "burrows": "роет",
    "leaps": "прыгает", "landing": "приземление", "ground": "земля", "prone": "ничком",
    "recharges": "перезаряжает", "whenever": "когда", "score": "результат",
    "the": "", "a": "", "an": "", "steps": "делает шаг", "rupture": "разрыв",
    "claw": "когтем", "tail": "хвостом", "jaws": "челюстями", "rounds": "раундов",
}


def compress_prose(text: str) -> str:
    for src, dst in sorted(PHRASES, key=lambda pair: len(pair[0]), reverse=True):
        text = text.replace(src, dst)
    out = []
    for raw in re.split(r"(\W+)", text):
        key = raw.lower().strip(".,;:()")
        if key in WORDS:
            if WORDS[key]:
                out.append(WORDS[key])
        else:
            out.append(raw)
    text = re.sub(r"\s+", " ", "".join(out)).strip()
    text = re.sub(r"\s+([.,;])", r"\1", text)
    if latin_ratio(text) <= 0.35:
        return text
    if len(text) <= 480:
        out = []
        for raw in re.split(r"(\W+)", text):
            key = raw.lower().strip(".,;:()")
            if key in WORDS:
                out.append(WORDS[key])
            elif latin_ratio(raw) < 0.5 or re.search(r"\d", raw):
                out.append(raw)
        text = re.sub(r"\s+", " ", "".join(out)).strip(" .,;")
        text = re.sub(r"\s+([.,;])", r"\1", text)
        if text and latin_ratio(text) <= 0.45:
            return text
    bits = re.findall(
        r"(?:условие|эффект|требование|частота|критический успех|критический провал|успех|провал|существо|дракон|союзник-гоблин|гоблин-воин|действие движения|шаг|конус \d+ футов|линия \d+ футов|взрыв \d+ футов|эманация \d+ футов|\d+d\d+(?:\s+\S+)?|СЛ \d+|\+\d+)",
        text,
        flags=re.I,
    )
    return ". ".join(dict.fromkeys(bits)) if bits else "В строке нет отдельного числа."


def render_markup(text: str) -> str:
    if not text:
        return ""

    def loc(match: re.Match[str]) -> str:
        key = match.group(1).split(".")[-1]
        return GLOSSARY_RU.get(key, f"словарная способность {key}")

    text = re.sub(r"@Localize\[([^\]]+)\]", loc, text)
    def damage_ru(match: re.Match[str]) -> str:
        head = match.group(1).split("|")[0]
        formula = re.sub(r"\[[a-z]+\]", "", head).strip()
        kinds = " ".join(DMG_RU.get(kind, kind) for kind in re.findall(r"\[([a-z]+)\]", head))
        return f"{formula} {kinds}".strip()

    text = re.sub(r"@Damage\[((?:[^\[\]]|\[[^\]]*\])+)\]", damage_ru, text)
    text = re.sub(r"@Template\[([^\]]+)\]", lambda m: template_ru(m.group(1)), text)
    text = re.sub(r"@Check\[([^\]]+)\]", lambda m: check_ru(m.group(1)), text)
    text = re.sub(r"@UUID\[[^\]]+\]\{([^}]+)\}", lambda m: m.group(1), text)
    text = re.sub(r"@UUID\[[^\]]+\]", "", text)
    text = re.sub(r"\[\[/gmr ([^#\]]+)[^\]]*\]\]\{[^}]*\}", r"\1", text)
    text = re.sub(r"\[\[/act ([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    swaps = [
        ("Critical Failure", "критический провал"),
        ("Critical Success", "критический успех"),
        ("Requirements", "Требование"),
        ("Frequency", "Частота"),
        ("Trigger", "Условие"),
        ("Effect", "Эффект"),
        ("Success", "успех"),
        ("Failure", "провал"),
        ("Hit Points", "хиты"),
        ("saving throw", "спасбросок"),
        ("multiple attack penalty", "штраф нескольких атак"),
        ("feet", "футов"),
        ("foot", "фут"),
        ("rounds", "раундов"),
        ("round", "раунд"),
        ("The monster", "Существо"),
        ("the monster", "существо"),
        ("The dragon", "Дракон"),
        ("the dragon", "дракон"),
    ]
    for src, dst in swaps:
        text = text.replace(src, dst)
    text = re.sub(r"\s+", " ", text).strip()
    return compress_prose(text)


def latin_ratio(text: str) -> float:
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 0
    latin = sum(1 for c in letters if "a" <= c.lower() <= "z")
    return latin / len(letters)


def template_ru(raw: str) -> str:
    kind, _, rest = raw.partition("|")
    dist = ""
    for part in rest.split("|"):
        if part.startswith("distance:"):
            dist = part.split(":", 1)[1]
    names = {"cone": "конус", "line": "линия", "burst": "взрыв", "emanation": "эманация", "cube": "куб"}
    return f"{names.get(kind, kind)} {dist} футов".strip()


def check_ru(raw: str) -> str:
    parts = raw.split("|")
    kind = parts[0]
    names = {
        "reflex": "рефлекс",
        "fortitude": "стойкость",
        "will": "воля",
        "flat": "чистая проверка",
        "perception": "восприятие",
        "acrobatics": "акробатика",
        "athletics": "атлетика",
    }
    dc = ""
    basic = "чистый " if "basic" in parts else ""
    for part in parts:
        if part.startswith("dc:"):
            dc = f" СЛ {part.split(':', 1)[1]}"
    return f"{basic}{names.get(kind, kind)}{dc}".strip()


def import_pf() -> list[dict]:
    rows = []
    for path in sorted(MC.glob("*.json")):
        data = json.loads(path.read_text())
        if data.get("type") != "npc":
            continue
        system = data["system"]
        pub = system.get("details", {}).get("publication", {})
        if pub.get("license") != "ORC" or pub.get("title") != "Pathfinder Monster Core":
            continue
        traits = system["traits"]
        attrs = system["attributes"]
        level = int(system["details"]["level"]["value"])
        size = traits.get("size", {}).get("value", "")
        rarity = traits.get("rarity", "common")
        trait_ids = list(traits.get("value") or [])
        speeds = [f"{attrs['speed']['value']} футов"]
        for extra in attrs["speed"].get("otherSpeeds") or []:
            speeds.append(f"{SPEED_RU.get(extra['type'], extra['type'])} {extra['value']} футов")
        senses = []
        for sense in system["perception"].get("senses") or []:
            label = SENSE_RU.get(sense.get("type"), sense.get("type", ""))
            acuity = {"precise": "точное", "imprecise": "неточное", "vague": "смутное"}.get(sense.get("acuity", ""), "")
            rng = f" {sense['range']} футов" if sense.get("range") else ""
            senses.append(" ".join(part for part in (acuity, label + rng) if part))
        languages = [LANG_RU.get(lang, lang) for lang in system["details"].get("languages", {}).get("value") or []]
        skills = []
        for key, val in (system.get("skills") or {}).items():
            skills.append(f"{SKILL_RU.get(key, key)} {signed(int(val.get('base', 0)))}")
        abilities = {key: int(system["abilities"][key]["mod"]) for key in AB_RU}
        saves = {
            "fort": int(system["saves"]["fortitude"]["value"]),
            "ref": int(system["saves"]["reflex"]["value"]),
            "will": int(system["saves"]["will"]["value"]),
        }
        immunities = [trait_ru(item.get("type", "")) for item in attrs.get("immunities") or []]
        resistances = []
        weaknesses = []
        for item in attrs.get("resistances") or []:
            exceptions = item.get("exceptions") or []
            extra = f", кроме {', '.join(trait_ru(x) for x in exceptions)}" if exceptions else ""
            resistances.append(f"{DMG_RU.get(item.get('type'), item.get('type'))} {item.get('value')}{extra}")
        for item in attrs.get("weaknesses") or []:
            weaknesses.append(f"{DMG_RU.get(item.get('type'), item.get('type'))} {item.get('value')}")
        strikes = []
        actions = []
        spells: dict[int, list[str]] = {}
        casting = []
        for item in data.get("items") or []:
            kind = item.get("type")
            sys = item.get("system") or {}
            if kind == "melee":
                rolls = list((sys.get("damageRolls") or {}).values())
                dmg = ", ".join(f"{roll.get('damage')} {DMG_RU.get(roll.get('damageType'), roll.get('damageType'))}" for roll in rolls)
                strikes.append({
                    "name": ru_phrase(item["name"]),
                    "originalName": item["name"],
                    "bonus": int((sys.get("bonus") or {}).get("value") or 0),
                    "damage": dmg,
                    "traits": [trait_ru(t) for t in (sys.get("traits") or {}).get("value") or []],
                })
            elif kind == "action":
                actions.append(action_row(item))
            elif kind == "spell":
                rank = int((sys.get("level") or {}).get("value") or 0)
                spells.setdefault(rank, []).append(item["name"])
            elif kind == "spellcastingEntry":
                casting.append({
                    "name": ru_phrase(item["name"]),
                    "originalName": item["name"],
                    "dc": int((sys.get("spelldc") or {}).get("dc") or 0),
                    "attack": int((sys.get("spelldc") or {}).get("value") or 0),
                    "tradition": {"arcane": "арканная", "divine": "божественная", "occult": "оккультная", "primal": "первозданная"}.get((sys.get("tradition") or {}).get("value"), ""),
                })
            if kind != "lore":
                for rule in sys.get("rules") or []:
                    if rule.get("key") == "Resistance":
                        exceptions = [item if isinstance(item, str) else str(item.get("type") or item) for item in (rule.get("exceptions") or [])]
                        extra = f", кроме {', '.join(trait_ru(x) for x in exceptions)}" if exceptions else ""
                        note = ""
                        pred = json.dumps(rule.get("predicate") or [])
                        if "hp-percent" in pred and '"lt"' in pred:
                            note = " ниже половины хитов"
                        elif "hp-percent" in pred:
                            note = " пока хиты не ниже половины"
                        kind = rule.get("type")
                        label = ", ".join(DMG_RU.get(part, part) for part in kind) if isinstance(kind, list) else DMG_RU.get(kind, str(kind))
                        resistances.append(f"{label} {rule.get('value')}{extra}{note}")
                    if rule.get("key") == "Weakness":
                        kind = rule.get("type")
                        label = ", ".join(DMG_RU.get(part, part) for part in kind) if isinstance(kind, list) else DMG_RU.get(kind, str(kind))
                        weaknesses.append(f"{label} {rule.get('value')}")
        original = data["name"]
        name = ru_phrase(original)
        lines = [
            f"{name}. Уровень {level}. {SIZE_RU.get(size, size)}, {RARITY_RU.get(rarity, rarity)}.",
            "Черты: " + ", ".join(trait_ru(t) for t in trait_ids) + "." if trait_ids else "",
            f"КБ {attrs['ac']['value']}. Хиты {attrs['hp']['max']}. Скорость {', '.join(speeds)}.",
            f"Восприятие {signed(int(system['perception']['mod']))}" + (f" ({', '.join(senses)})" if senses else "") + ".",
            ("Языки: " + ", ".join(languages) + ".") if languages else "Языки не указаны.",
            ("Навыки: " + ", ".join(skills) + ".") if skills else "",
            "Характеристики, модификатор из поля: " + ", ".join(f"{AB_RU[k]} {signed(abilities[k])}" for k in AB_RU) + ".",
            f"Стойкость {signed(saves['fort'])}, Рефлекс {signed(saves['ref'])}, Воля {signed(saves['will'])}.",
            ("Иммунитеты: " + ", ".join(immunities) + ".") if immunities else "",
            ("Сопротивления: " + "; ".join(resistances) + ".") if resistances else "",
            ("Уязвимости: " + "; ".join(weaknesses) + ".") if weaknesses else "",
        ]
        if strikes:
            lines.append("Удары:")
            for strike in strikes:
                extra = f" Свойства: {', '.join(strike['traits'])}." if strike["traits"] else ""
                lines.append(f"{strike['name']} ({strike['originalName']}) {signed(strike['bonus'])}, урон {strike['damage']}.{extra}")
        if actions:
            lines.append("Способности:")
            for action in actions:
                lines.append(action["line"])
        if casting:
            book = casting[0]
            lines.append(f"Заклинания: {book['name']}. Традиция: {book['tradition']}. СЛ {book['dc']}, атака {signed(book['attack'])}.")
            for rank in sorted(spells):
                label = "заговоры" if rank == 0 else f"{rank} круг"
                lines.append(f"{label}: {', '.join(spells[rank])}.")
        lines.append("Числа сняты с полей Foundry, пакет pathfinder-monster-core, книга Pathfinder Monster Core, лицензия ORC. Имена заклинаний оставлены как в поле.")
        rows.append({
            "id": path.stem,
            "name": name,
            "originalName": original,
            "level": level,
            "cr": str(level),
            "xp": None,
            "size": SIZE_RU.get(size, size),
            "kind": creature_kind(trait_ids),
            "traits": [trait_ru(t) for t in trait_ids],
            "ac": int(attrs["ac"]["value"]),
            "hp": int(attrs["hp"]["max"]),
            "text": "\n".join(line for line in lines if line),
        })
    return rows


def action_row(item: dict) -> dict:
    sys = item["system"]
    count = (sys.get("actions") or {}).get("value")
    if count in (1, 2, 3):
        cost = f"{count} действия" if count > 1 else "1 действие"
    elif (sys.get("actionType") or {}).get("value") == "reaction":
        cost = "реакция"
    elif (sys.get("actionType") or {}).get("value") == "free":
        cost = "свободное"
    else:
        cost = "пассивно"
    traits = [trait_ru(t) for t in (sys.get("traits") or {}).get("value") or []]
    body = render_markup((sys.get("description") or {}).get("value") or "")
    name = ru_phrase(item["name"])
    bits = [f"{name} ({item['name']}), {cost}"]
    if traits:
        bits.append("свойства: " + ", ".join(traits))
    if body:
        bits.append(body)
    return {"line": ". ".join(bits) + "."}


def column_text(doc: pymupdf.Document, start: int, end: int) -> str:
    chunks = []
    for index in range(start - 1, end):
        page = doc[index]
        blocks = page.get_text("blocks")
        left = sorted((b for b in blocks if b[0] < 300 and b[6] == 0), key=lambda b: b[1])
        right = sorted((b for b in blocks if b[0] >= 300 and b[6] == 0), key=lambda b: b[1])
        for block in left + right:
            text = block[4].strip()
            if text.startswith("System Reference Document"):
                continue
            chunks.append(text)
    raw = "\n".join(chunks)
    raw = re.sub(r"-\n([a-z])", r"\1", raw)
    raw = raw.replace("\u00ad", "")
    return raw


FAMILY52 = {
    "Animated Objects", "Awakened Plants", "Bandits", "Black Dragons", "Blue Dragons", "Brass Dragons",
    "Bronze Dragons", "Bugbears", "Copper Dragons", "Cultists", "Fungi", "Goblins", "Gold Dragons",
    "Green Dragons", "Guards", "Hobgoblins", "Mages", "Mephits", "Mummies", "Pirates", "Priests",
    "Red Dragons", "Silver Dragons", "Skeletons", "Sphinxes", "Toughs", "Vampires", "Warriors",
    "White Dragons", "Zombies", "Animals",
}
SIZE_WORD = r"(?:Tiny|Small|Medium|Large|Huge|Gargantuan)"
HEADER52 = re.compile(
    rf"^(?P<size>{SIZE_WORD}(?: or {SIZE_WORD})?(?: Swarm of {SIZE_WORD})?)\s+"
    rf"(?P<kind>[A-Za-z]+)(?:\s*\((?P<sub>[^)]+)\))?,\s+(?P<align>.+)$"
)


def parse_srd52() -> list[dict]:
    doc = pymupdf.open(PDF52)
    toc = [(title, page) for level, title, page in doc.get_toc() if level >= 3 and 258 <= page <= 364]
    names = [title for title, _page in toc if title not in {"Stat Block Overview", "Parts of a Stat Block", "Running a Monster"}]
    names = [name for name in names if name not in FAMILY52]
    names.append("Swarm of Crawling Claws")
    text = column_text(doc, 258, 364)
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines()]
    lines = [line for line in lines if line and not re.fullmatch(r"\d{2,3}", line)]
    anchors = []
    name_set = set(names)
    for index, line in enumerate(lines):
        if line not in name_set:
            continue
        look = index + 1
        while look < len(lines) and lines[look] == line:
            look += 1
        if look < len(lines) and HEADER52.match(lines[look]):
            anchors.append(index)
    best: dict[str, dict] = {}
    for pos, start in enumerate(anchors):
        end = anchors[pos + 1] if pos + 1 < len(anchors) else len(lines)
        row = parse_2024_chunk(lines[start:end])
        if not row:
            continue
        previous = best.get(row["id"])
        if previous is None or len(row["text"]) > len(previous["text"]):
            best[row["id"]] = row
    return list(best.values())


SIZE_EN = {"Tiny": "крошечный", "Small": "малый", "Medium": "средний", "Large": "крупный", "Huge": "огромный", "Gargantuan": "исполинский"}
TYPE_RU = {
    "aberration": "аберрация",
    "beast": "зверь",
    "celestial": "небожитель",
    "construct": "конструкт",
    "dragon": "дракон",
    "elemental": "элементаль",
    "fey": "фея",
    "fiend": "исчадие",
    "giant": "великан",
    "humanoid": "гуманоид",
    "monstrosity": "чудовище",
    "ooze": "слизь",
    "plant": "растение",
    "undead": "нежить",
}


def cr_parts(body: str) -> re.Match[str] | None:
    return re.search(r"CR\s+(\d+(?:/\d+)?)\s*\(([^)]+)\)", body)


def xp_of(inside: str) -> tuple[int, str] | None:
    plain = re.sub(r"or\s+[\d,]+\s+in lair", "", inside)
    match = re.search(r"(?:XP\s+([\d,]+)|([\d,]+)\s+XP)", plain)
    if not match:
        return None
    raw = match.group(1) or match.group(2)
    pb = re.search(r"PB\s+(\+\d+)", inside)
    return int(raw.replace(",", "")), (pb.group(1) if pb else "")


def size_phrase(size: str) -> str:
    words = [SIZE_EN[word] for word in re.findall(r"Tiny|Small|Medium|Large|Huge|Gargantuan", size)]
    if "Swarm" in size and len(words) == 2:
        return f"рой, размер роя {words[0]}, особь {words[1]}"
    return " или ".join(words)


def parse_2024_chunk(lines: list[str]) -> dict | None:
    name = lines[0]
    cursor = 1
    while cursor < len(lines) and lines[cursor] == name:
        cursor += 1
    header = lines[cursor] if cursor < len(lines) else ""
    match = HEADER52.match(header)
    if not match:
        return None
    body = "\n".join(lines[cursor + 1:])
    ac = re.search(r"AC\s+(\d+)", body)
    hp = re.search(r"HP\s+(\d+)\s*\(([^)]+)\)", body)
    speed = re.search(r"Speed\s+([^\n]+)", body)
    cr = cr_parts(body)
    spent = xp_of(cr.group(2)) if cr else None
    if not (ac and hp and cr and spent):
        return None
    abilities = parse_ability_line(body)
    text = render_2024(name, match, ac, hp, speed, cr, spent, abilities, body)
    cr_text = cr.group(1)
    traits = [part.strip() for part in match.group("align").split(",")]
    if match.group("sub"):
        traits.insert(0, match.group("sub"))
    kind = TYPE_RU.get(match.group("kind").lower(), match.group("kind").lower())
    return {
        "id": slug(name),
        "name": ru_phrase(name),
        "originalName": name,
        "level": cr_rank(cr_text),
        "cr": cr_text,
        "xp": spent[0],
        "size": size_phrase(match.group("size")),
        "kind": kind,
        "traits": traits,
        "ac": int(ac.group(1)),
        "hp": int(hp.group(1)),
        "text": text,
    }


def cr_rank(text: str) -> float:
    if "/" in text:
        num, den = text.split("/")
        return int(num) / int(den)
    return float(text)


def parse_ability_line(body: str) -> dict[str, tuple[int, str]]:
    window = re.search(r"Str\s+.+?(?=Skills|Senses|Languages|Resistances|Immunities|Vulnerabilities|Gear|CR\s)", body, re.S)
    blob = re.sub(r"\s+", " ", window.group(0) if window else body).replace("−", "-")
    found = {}
    for key, label in (("str", "Str"), ("dex", "Dex"), ("con", "Con"), ("int", "Int"), ("wis", "Wis"), ("cha", "Cha")):
        match = re.search(rf"{label}\s+(\d+)\s+([+\-]\d+)", blob)
        if match:
            found[key] = (int(match.group(1)), match.group(2))
    return found


def render_2024(name, header, ac, hp, speed, cr, spent, abilities, body: str) -> str:
    kind = TYPE_RU.get(header.group("kind").lower(), header.group("kind").lower())
    sub = f" ({header.group('sub')})" if header.group("sub") else ""
    lines = [
        f"{ru_phrase(name)} ({name}). {size_phrase(header.group('size'))}, {kind}{sub}, {header.group('align')}.",
        f"КБ {ac.group(1)}. Хиты {hp.group(1)} ({hp.group(2).replace(' ', '')}).",
        f"Скорость {speed_ru(speed.group(1))}." if speed else "",
    ]
    if abilities:
        lines.append("Характеристики: " + ", ".join(f"{AB_RU[key]} {score} ({mod})" for key, (score, mod) in abilities.items()) + ".")
    for label, ru in (
        ("Initiative", "Инициатива"),
        ("Skills", "Навыки"),
        ("Senses", "Чувства"),
        ("Languages", "Языки"),
        ("Resistances", "Сопротивления"),
        ("Immunities", "Иммунитеты"),
        ("Vulnerabilities", "Уязвимости"),
        ("Gear", "Снаряжение"),
    ):
        match = re.search(rf"{label}\s+([^\n]+)", body)
        if match:
            lines.append(f"{ru}: {speed_ru(match.group(1).strip())}.")
    pb = f", бонус мастерства {spent[1]}" if spent[1] else ""
    lines.append(f"Опасность {cr.group(1)} (опыт {spent[0]}{pb}). Опыт в логове, если он указан в скобках, в трату встречи не входит.")
    attacks = attack_lines_2024(body)
    if attacks:
        lines.append("Удары и приёмы, только числа строки:")
        lines.extend(attacks)
    lines.append("Числа сняты со страниц бестиария System Reference Document 5.2.1, лицензия CC-BY-4.0. Абзац книги не скопирован.")
    return "\n".join(line for line in lines if line)


def attack_lines_2024(body: str) -> list[str]:
    flat = re.sub(r"\s+", " ", body)
    rows = []
    multi = re.search(r"Multiattack\.\s+The \w+ makes (\w+)(?: \w+)? attacks", flat)
    count = {"two": "две", "three": "три", "four": "четыре", "five": "пять"}.get(multi.group(1).lower() if multi else "", "")
    if count:
        rows.append(f"Несколько атак: {count}.")
    for match in re.finditer(
        r"([A-Z][A-Za-z'’\- ]{1,48}?)\. (Melee|Ranged) Attack Roll: ([+\-\d]+), (reach|range) ([\d/]+) ft\. Hit: (\d+) \(([^)]+)\) ([A-Za-z]+)",
        flat,
    ):
        where = "ближний бой" if match.group(2) == "Melee" else "дальний бой"
        reach = "досягаемость" if match.group(4) == "reach" else "дистанция"
        rows.append(
            f"{ru_phrase(match.group(1).strip())}: {where}, бросок {match.group(3)}, {reach} {match.group(5)} футов, попадание {match.group(6)} ({match.group(7).replace(' ', '')}) {DMG_RU.get(match.group(8).lower(), match.group(8).lower())}."
        )
    for match in re.finditer(
        r"DC (\d+), each creature in an? (\d+)-foot Cone\. Failure: (\d+) \(([^)]+)\) ([A-Za-z]+) damage",
        flat,
    ):
        rows.append(
            f"Дыхание: конус {match.group(2)} футов, СЛ {match.group(1)}, провал {match.group(3)} ({match.group(4).replace(' ', '')}) {DMG_RU.get(match.group(5).lower(), match.group(5).lower())}, успех — половина."
        )
    # Уникальные строки без кости остаются за числом выше: английский абзац не переписываем.
    return rows[:12]


def speed_ru(text: str) -> str:
    text = text.replace("ft.", "футов").replace("ft", "футов")
    for src, dst in (
        ("Swim", "плавание"), ("swim", "плавание"), ("Fly", "полёт"), ("fly", "полёт"),
        ("Burrow", "рытьё"), ("burrow", "рытьё"), ("Climb", "лазание"), ("climb", "лазание"),
        ("hover", "парение"),
    ):
        text = text.replace(src, dst)
    return text


def translate_srd_body(text: str) -> str:
    swaps = [
        ("Melee Attack Roll", "бросок атаки ближнего боя"),
        ("Ranged Attack Roll", "бросок дальней атаки"),
        ("Saving Throw", "спасбросок"),
        ("Hit:", "попадание:"),
        ("Miss:", "промах:"),
        ("Failure:", "провал:"),
        ("Success:", "успех:"),
        ("Hit Points", "хиты"),
        ("Bonus Action", "бонусное действие"),
        ("Legendary Resistance", "легендарная устойчивость"),
        ("Multiattack", "несколько атак"),
        ("reach", "досягаемость"),
        ("feet", "футов"),
        ("ft.", "футов"),
        ("damage", "урона"),
        ("Bludgeoning", "дробящего"),
        ("Piercing", "колющего"),
        ("Slashing", "рубящего"),
        ("Fire", "огнём"),
        ("Cold", "холодом"),
        ("Lightning", "молнией"),
        ("Thunder", "звуком"),
        ("Acid", "кислотой"),
        ("Poison", "ядом"),
        ("Necrotic", "некротической"),
        ("Radiant", "излучением"),
        ("Psychic", "психической"),
        ("Force", "силовой"),
    ]
    for src, dst in swaps:
        text = text.replace(src, dst)
    if latin_ratio(text) > 0.45:
        bits = re.findall(r"(?:\d+d\d+(?:\s*\+\s*\d+)?|\+\d+|СЛ \d+|DC \d+|досягаемость \d+ футов|попадание:[^.]+|несколько атак|легендарная устойчивость)", text)
        text = ". ".join(bits) if bits else "Особенность без отдельного числа в строке блока."
    return re.sub(r"\s+", " ", text).strip()


def parse_srd51() -> list[dict]:
    doc = pymupdf.open(PDF51)
    chunks = []
    for index in range(260, doc.page_count):
        raw = doc[index].get_text()
        raw = raw.replace("\u00ad", "").replace("\xa0", " ")
        raw = re.sub(r"(\w)-\s+(\w)", r"\1\2", raw)
        raw = re.sub(r"\s+", " ", raw)
        raw = re.sub(r"System Reference Document 5\.1 \d+ ", " ", raw)
        raw = re.sub(r"Monsters \([A-Z]\) ", " ", raw)
        chunks.append(raw)
    text = " ".join(chunks)
    name = r"(?:[A-Z][A-Za-z'’\-]+)(?: (?:[A-Z][A-Za-z'’\-]+|of|the|a|and))*"
    kind = r"[a-z]+(?: of (?:Tiny|Small|Medium|Large|Huge|Gargantuan) [a-z]+)?"
    pattern = re.compile(
        rf"(?P<name>{name}) "
        rf"(?P<size>Tiny|Small|Medium|Large|Huge|Gargantuan) "
        rf"(?P<kind>{kind})(?: \((?P<sub>[^)]+)\))?, "
        rf"(?P<align>[a-z][a-z\- ]*?) "
        rf"Armor Class (?P<ac>\d+)"
        rf"(?P<body>.*?)"
        rf"(?= {name} (?:Tiny|Small|Medium|Large|Huge|Gargantuan) {kind}(?: \([^)]+\))?, [a-z]|\Z)",
        re.S,
    )
    rows = []
    seen = set()
    stop = {"Monsters", "Actions", "Legendary Actions", "Reactions", "Armor", "Hit", "Speed", "System", "Challenge"}
    for match in pattern.finditer(text):
        title = match.group("name").strip()
        if title in stop or title.endswith(" Dragons"):
            continue
        body = match.group("body")
        hp = re.search(r"Hit Points (\d+) \(([^)]+)\)", body)
        cr = re.search(r"Challenge (\d+(?:/\d+)?) \(([\d,]+)\s*XP\)", body)
        scores = re.search(
            r"STR\s+DEX\s+CON\s+INT\s+WIS\s+CHA\s+"
            r"(\d+)\s+\(([+\-−\u2212]\d+)\)\s+(\d+)\s+\(([+\-−\u2212]\d+)\)\s+"
            r"(\d+)\s+\(([+\-−\u2212]\d+)\)\s+(\d+)\s+\(([+\-−\u2212]\d+)\)\s+"
            r"(\d+)\s+\(([+\-−\u2212]\d+)\)\s+(\d+)\s+\(([+\-−\u2212]\d+)\)",
            body,
        )
        if not hp or not cr or not scores:
            continue
        ident = slug(title)
        if ident in seen:
            ident = f"{ident}-{len(seen)}"
        seen.add(ident)
        cr_text = cr.group(1)
        kind_name = match.group("kind").strip().split()[0]
        subtype = match.group("sub")
        traits = [match.group("align").strip()]
        if subtype:
            traits.insert(0, subtype.strip())
        speed = re.search(r"Speed (.+?) (?:STR|Saving Throws|Skills|Damage|Senses|Languages|Challenge)\b", body)
        ability_line = "Характеристики: " + ", ".join(
            f"{label} {scores.group(i)} ({scores.group(i + 1).replace('−', '-').replace('\u2212', '-')})"
            for label, i in (("Сил", 1), ("Лов", 3), ("Тел", 5), ("Инт", 7), ("Мдр", 9), ("Хар", 11))
        ) + "."
        extra = []
        for label, ru in (
            ("Saving Throws", "Спасброски"),
            ("Skills", "Навыки"),
            ("Damage Resistances", "Сопротивления урону"),
            ("Damage Immunities", "Иммунитет к урону"),
            ("Damage Vulnerabilities", "Уязвимость к урону"),
            ("Condition Immunities", "Иммунитет к состояниям"),
            ("Senses", "Чувства"),
            ("Languages", "Языки"),
        ):
            found = re.search(rf"{label} (.+?) (?=(?:Saving Throws|Skills|Damage Resistances|Damage Immunities|Damage Vulnerabilities|Condition Immunities|Senses|Languages|Challenge)\b)", body)
            if found:
                extra.append(f"{ru}: {speed_ru(found.group(1).strip())}.")
        lines = [
            f"{ru_phrase(title)} ({title}). {SIZE_EN[match.group('size')]}, {TYPE_RU.get(kind_name, kind_name)}"
            + (f" ({subtype.strip()})" if subtype else "")
            + f", {match.group('align').strip()}.",
            f"КБ {match.group('ac')}. Хиты {hp.group(1)} ({hp.group(2).replace(' ', '')}).",
            f"Скорость {speed_ru(speed.group(1))}." if speed else "",
            ability_line,
            *extra,
            f"Опасность {cr_text} (опыт {cr.group(2).replace(',', '')}).",
            *attack_lines_2014(body),
            "Числа сняты с бестиария System Reference Document 5.1, лицензия CC-BY-4.0. Это не блок 2024 года. Абзац книги не скопирован.",
        ]
        rows.append({
            "id": ident,
            "name": ru_phrase(title),
            "originalName": title,
            "level": cr_rank(cr_text),
            "cr": cr_text,
            "xp": int(cr.group(2).replace(",", "")),
            "size": SIZE_EN[match.group("size")],
            "kind": TYPE_RU.get(kind_name, kind_name),
            "traits": traits,
            "ac": int(match.group("ac")),
            "hp": int(hp.group(1)),
            "text": "\n".join(line for line in lines if line),
        })
    return rows


def attack_lines_2014(body: str) -> list[str]:
    rows = []
    multi = re.search(r"Multiattack\. The \w+ makes (\w+)", body)
    count = {"two": "две", "three": "три", "four": "четыре", "five": "пять"}.get(multi.group(1).lower() if multi else "", "")
    if count:
        rows.append(f"Несколько атак: {count}.")
    for match in re.finditer(
        r"([A-Z][A-Za-z'’\- ]{1,40}?)\. Melee Weapon Attack: \+(\d+) to hit, reach (\d+) ft\., one target\. Hit: (\d+) \(([^)]+)\) ([a-z]+) damage",
        body,
    ):
        title = match.group(1).strip().split()[-1]
        rows.append(
            f"{ru_phrase(title)}: ближний бой +{match.group(2)}, досягаемость {match.group(3)} футов, попадание {match.group(4)} ({match.group(5).replace(' ', '')}) {DMG_RU.get(match.group(6), match.group(6))}."
        )
    for match in re.finditer(
        r"([A-Z][A-Za-z'’\- ]{1,40}?)\. Ranged Weapon Attack: \+(\d+) to hit, range ([\d/]+) ft\..*?Hit: (\d+) \(([^)]+)\) ([a-z]+) damage",
        body,
    ):
        title = match.group(1).strip().split()[-1]
        rows.append(
            f"{ru_phrase(title)}: дальний бой +{match.group(2)}, дистанция {match.group(3)} футов, попадание {match.group(4)} ({match.group(5).replace(' ', '')}) {DMG_RU.get(match.group(6), match.group(6))}."
        )
    for match in re.finditer(
        r"([A-Z][A-Za-z'’\- ]{1,40}?) \(Recharge [^)]+\).*?DC (\d+) \w+ saving throw, taking (\d+) \(([^)]+)\) ([a-z]+) damage",
        body,
    ):
        rows.append(
            f"{ru_phrase(match.group(1).strip())}: перезарядка, СЛ {match.group(2)}, урон {match.group(3)} ({match.group(4).replace(' ', '')}) {DMG_RU.get(match.group(5), match.group(5))}."
        )
    return rows[:12]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    pf = import_pf()
    srd52 = parse_srd52()
    srd51 = parse_srd51()
    (OUT / "monsters-pf.json").write_text(json.dumps(pf, ensure_ascii=False, indent=2) + "\n")
    (OUT / "monsters-2024.json").write_text(json.dumps(srd52, ensure_ascii=False, indent=2) + "\n")
    (OUT / "monsters-2014.json").write_text(json.dumps(srd51, ensure_ascii=False, indent=2) + "\n")
    def pick(rows: list[dict], name: str) -> dict | None:
        return next((row for row in rows if row["originalName"] == name), None)

    summary = {
        "pf": len(pf),
        "srd52": len(srd52),
        "srd51": len(srd51),
        "pfGoblin": {k: pick(pf, "Goblin Warrior")[k] for k in ("kind", "ac", "hp", "level")} if pick(pf, "Goblin Warrior") else None,
        "aboleth52": {k: pick(srd52, "Aboleth")[k] for k in ("ac", "hp", "cr", "xp")} if pick(srd52, "Aboleth") else None,
        "goblin52": {k: pick(srd52, "Goblin Warrior")[k] for k in ("ac", "hp", "cr", "xp", "kind")} if pick(srd52, "Goblin Warrior") else None,
        "red52": {k: pick(srd52, "Adult Red Dragon")[k] for k in ("ac", "hp", "cr", "xp")} if pick(srd52, "Adult Red Dragon") else None,
        "tarrasque52": {k: pick(srd52, "Tarrasque")[k] for k in ("ac", "hp", "cr", "xp")} if pick(srd52, "Tarrasque") else None,
        "aboleth51": {k: pick(srd51, "Aboleth")[k] for k in ("ac", "hp", "cr", "xp")} if pick(srd51, "Aboleth") else None,
        "youngRed51": {k: pick(srd51, "Young Red Dragon")[k] for k in ("ac", "hp", "cr", "xp")} if pick(srd51, "Young Red Dragon") else None,
        "tarrasque51": {k: pick(srd51, "Tarrasque")[k] for k in ("ac", "hp", "cr", "xp")} if pick(srd51, "Tarrasque") else None,
        "goblin51": pick(srd51, "Goblin") is not None,
    }
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
