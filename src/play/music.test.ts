import { describe, expect, it } from "vitest";
import { musicSceneFor, readMusicOn, readMusicVolume } from "./music";

describe("музыка", () => {
  it("по умолчанию выключена и не включает бой вне сцены боя", () => {
    expect(readMusicOn({ getItem: () => null })).toBe(false);
    expect(readMusicVolume({ getItem: () => null })).toBe(0.35);
    expect(musicSceneFor("#/")).toBe("tavern");
    expect(musicSceneFor("#/c/hero/now", "talk")).toBe("tavern");
    expect(musicSceneFor("#/c/hero/now", "fight")).toBe("combat");
    expect(musicSceneFor("#/bestiary")).toBe("bestiary");
    expect(musicSceneFor("#/training/hero")).toBe("combat");
  });
  it("работает при запрете хранения настроек и ограничивает громкость", () => {
    const denied = { getItem: () => { throw new Error("denied"); } };
    expect(readMusicOn(denied)).toBe(false);
    expect(readMusicVolume(denied)).toBe(0.35);
    expect(readMusicVolume({ getItem: () => "5" })).toBe(1);
    expect(readMusicVolume({ getItem: () => "-5" })).toBe(0);
  });
});
