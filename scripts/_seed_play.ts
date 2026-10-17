import { writeFileSync } from "node:fs";
import { guardCharacter } from "../src/dnd/guard";
import { artefolCharacter } from "../src/pf2e/artefol";
import { serialize } from "../src/transfer";

const artefol = artefolCharacter();
artefol.reminder = {
  backstory: "Таскал раненых с поля и не любит бросать своих.",
  deity: { name: "Саренрей", domains: "солнце", symbol: "солнце", weapon: "скимитар", edicts: "Лечить тех, кто просит.", anathema: "Не бросать раненого." },
  vows: [{ id: "taboo-1", kind: "taboo", text: "Не бить безоружного." }],
};
const guard = guardCharacter();
guard.reminder = {
  backstory: "Держал ворота Ограда, пока их не снесли.",
  deity: { name: "", domains: "", symbol: "", weapon: "", edicts: "", anathema: "" },
  vows: [{ id: "duty-1", kind: "duty", text: "Не бросать пост, пока смена не пришла." }],
};
writeFileSync("/tmp/heroes.json", serialize([artefol, guard]));
console.log(artefol.id, guard.id);
