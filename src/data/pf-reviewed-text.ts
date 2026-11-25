interface ReviewedText {
  name: string;
  summary: string;
  link: string;
  prereqNote?: string;
  heightened?: string;
}

const reviewed: Record<string, ReviewedText> = {
  "it-takes-a-village": {
    name: "Вместе легче",
    summary: "Когда вы делаете проверку, чтобы помочь другому существу действием «Помощь» (Aid), получите +4 обстоятельственного бонуса к этой проверке. Не прибавляйте этот бонус к броску товарища.",
    link: "https://github.com/foundryvtt/pf2e/blob/0a508ab90c1975801c3fef31d50f07e3f50b6578/packs/pf2e/feats/ancestry/nagaji/level-1/it-takes-a-village.json",
  },
  "sudden-terror": {
    name: "Внезапный ужас",
    prereqNote: "наследие куклы цукумогами (Tsukumogami Poppet)",
    summary: "Деморализуйте существо в пределах 30 футов. Оно должно вас увидеть: приём зрительный, а не слуховой, и общего языка не требует. Если до этого вы были скрыты от цели, получите +2 обстоятельственного бонуса к Запугиванию; при обычном успехе цель получает испуг 2 вместо 1. Свидетели невосприимчивы к вашему «Внезапному ужасу» 24 часа.",
    link: "https://github.com/foundryvtt/pf2e/blob/0a508ab90c1975801c3fef31d50f07e3f50b6578/packs/pf2e/feats/ancestry/poppet/level-1/sudden-terror.json",
  },
  "oni-weapon-familiarity": {
    name: "Владение оружием они",
    summary: "Для определения владения считайте кхаккхару, нодати, крюк огра и тэцубо простым оружием. С 5-го уровня критическое попадание любым из них или безоружным ударом рогами даёт эффект критической специализации.",
    link: "https://github.com/foundryvtt/pf2e/blob/0a508ab90c1975801c3fef31d50f07e3f50b6578/packs/pf2e/feats/ancestry/versatile-heritages/hungerseed/oni-weapon-familiarity.json",
  },
  "orc-sight": {
    name: "Орочье зрение",
    prereqNote: "сумеречное зрение",
    summary: "Получите тёмное зрение. В полной темноте вы различаете только оттенки серого. Черту можно взять только на 1-м уровне; переобучением её нельзя ни получить, ни заменить.",
    link: "https://github.com/foundryvtt/pf2e/blob/0a508ab90c1975801c3fef31d50f07e3f50b6578/packs/pf2e/feats/ancestry/versatile-heritages/dromaar/orc-sight.json",
  },
  "angel-form": {
    name: "Облик ангела",
    summary: "На минуту принимает боевую форму балиссе, хорового ангела, курибу или тэннина. Форма даёт полёт, тёмное зрение, КБ 22 + уровень, 40 временных хитов и слабость 10 к нечестивому урону. Доступные удары и особые способности зависят от выбранного облика.",
    heightened: "На 9-м круге: 60 временных хитов, слабость 15, атака +30, бонус урона +20, Атлетика +33. Балиссе и тэннин становятся большими, если есть место.",
    link: "https://github.com/foundryvtt/pf2e/blob/0a508ab90c1975801c3fef31d50f07e3f50b6578/packs/pf2e/spells/spells/rank-7/angel-form.json",
  },
};

export function reviewedPfText(id: string): ReviewedText | undefined {
  return Object.hasOwn(reviewed, id) ? reviewed[id] : undefined;
}
