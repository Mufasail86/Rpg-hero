import { useEffect, useState } from "react";
import {
  MUSIC_CACHE,
  MUSIC_LICENSE_EN,
  MUSIC_LICENSE_LINK,
  MUSIC_LICENSE_RU,
  MUSIC_ON_KEY,
  MUSIC_TRACKS,
  MUSIC_VOLUME_KEY,
  musicSceneFor,
  readMusicOn,
  readMusicVolume,
  type MusicScene,
} from "../play/music";
import { go } from "./common";

const tracks = new Map(MUSIC_TRACKS.map((track) => [track.id, track]));

class Ambient {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private playing: { scene: MusicScene; source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private buffers = new Map<MusicScene, AudioBuffer>();
  volume = 0.35;
  enabled = false;

  setVolume(value: number) {
    this.volume = value;
    if (this.master && this.context) this.master.gain.setTargetAtTime(value, this.context.currentTime, 0.08);
  }

  private async contextOf(): Promise<AudioContext> {
    if (!this.context) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.context = new Ctx();
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") await this.context.resume();
    return this.context;
  }

  private async buffer(scene: MusicScene): Promise<AudioBuffer> {
    const cached = this.buffers.get(scene);
    if (cached) return cached;
    const file = tracks.get(scene)?.file ?? "music/tavern.ogg";
    const url = new URL(file, document.baseURI).toString();
    let response = await fetch(url).catch(() => null);
    if (!response || !response.ok) {
      const hit = await caches.match(url).catch(() => undefined);
      if (!hit) throw new Error(file);
      response = hit;
    } else {
      const copy = response.clone();
      caches.open(MUSIC_CACHE).then((cache) => cache.put(url, copy)).catch(() => undefined);
    }
    const audio = await (await this.contextOf()).decodeAudioData(await response.arrayBuffer());
    this.buffers.set(scene, audio);
    return audio;
  }

  async start(scene: MusicScene) {
    this.enabled = true;
    const context = await this.contextOf();
    if (this.playing?.scene === scene) return;
    const audio = await this.buffer(scene);
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.connect(this.master!);
    const source = context.createBufferSource();
    source.buffer = audio;
    source.loop = true;
    source.connect(gain);
    const now = context.currentTime;
    source.start();
    gain.gain.linearRampToValueAtTime(1, now + 0.9);
    if (this.playing) {
      const previous = this.playing;
      previous.gain.gain.cancelScheduledValues(now);
      previous.gain.gain.setValueAtTime(previous.gain.gain.value, now);
      previous.gain.gain.linearRampToValueAtTime(0, now + 0.9);
      previous.source.stop(now + 1);
    }
    this.playing = { scene, source, gain };
  }

  stop() {
    this.enabled = false;
    if (!this.context || !this.playing) return;
    const now = this.context.currentTime;
    const previous = this.playing;
    previous.gain.gain.cancelScheduledValues(now);
    previous.gain.gain.setValueAtTime(previous.gain.gain.value, now);
    previous.gain.gain.linearRampToValueAtTime(0, now + 0.35);
    previous.source.stop(now + 0.4);
    this.playing = null;
  }
}

const ambient = new Ambient();

export function MusicControl({ hash }: { hash: string }) {
  const storage = typeof localStorage === "undefined" ? null : localStorage;
  const [on, setOn] = useState(() => readMusicOn(storage));
  const [volume, setVolume] = useState(() => readMusicVolume(storage));
  const [open, setOpen] = useState(false);
  const [playScene, setPlayScene] = useState("");
  const [error, setError] = useState("");
  const scene = musicSceneFor(hash, playScene);

  useEffect(() => {
    ambient.volume = volume;
    ambient.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    const onScene = (event: Event) => setPlayScene(String((event as CustomEvent).detail ?? ""));
    window.addEventListener("rpg-play-scene", onScene);
    return () => window.removeEventListener("rpg-play-scene", onScene);
  }, []);

  useEffect(() => {
    if (!on) {
      ambient.stop();
      return;
    }
    void ambient.start(scene).catch(() => setError("Не удалось открыть запись. Проверьте, что файл музыки на месте."));
  }, [on, scene]);

  function toggle() {
    const next = !on;
    setOn(next);
    setError("");
    try {
      localStorage.setItem(MUSIC_ON_KEY, next ? "1" : "0");
    } catch {
      /* выбор остаётся до перезагрузки */
    }
    if (!next) ambient.stop();
  }

  function changeVolume(value: number) {
    setVolume(value);
    ambient.setVolume(value);
    try {
      localStorage.setItem(MUSIC_VOLUME_KEY, String(value));
    } catch {
      /* громкость остаётся на этот заход */
    }
  }

  return (
    <div className="music-dock">
      <button type="button" className={`icon-btn music-toggle ${on ? "on" : ""}`} data-testid="music-toggle" aria-pressed={on} aria-label={on ? "Выключить музыку" : "Включить музыку"} title={on ? "Музыка играет" : "Музыка выключена"} onClick={() => { setOpen((value) => !value); }}>
        {on ? "♪" : "🔇"}
      </button>
      {open && (
        <div className="music-panel card stack" data-testid="music-panel">
          <b>{on ? "Музыка включена" : "Музыка выключена"}</b>
          <p className="tiny">Сейчас: {tracks.get(scene)?.title}. Сама не начинается, пока не нажмёте.</p>
          <button type="button" className="btn" data-testid="music-switch" onClick={toggle}>{on ? "Выключить" : "Включить"}</button>
          <label className="field">
            <span>Громкость</span>
            <input data-testid="music-volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => changeVolume(Number(event.target.value))} />
          </label>
          {error && <p className="tiny">{error}</p>}
          <button type="button" className="text-btn" onClick={() => { setOpen(false); go("#/settings"); }}>Настройки и права</button>
        </div>
      )}
    </div>
  );
}

export function SettingsPage() {
  const storage = typeof localStorage === "undefined" ? null : localStorage;
  const [on, setOn] = useState(() => readMusicOn(storage));
  const [volume, setVolume] = useState(() => readMusicVolume(storage));

  function persist(nextOn: boolean, nextVolume: number) {
    setOn(nextOn);
    setVolume(nextVolume);
    ambient.setVolume(nextVolume);
    try {
      localStorage.setItem(MUSIC_ON_KEY, nextOn ? "1" : "0");
      localStorage.setItem(MUSIC_VOLUME_KEY, String(nextVolume));
    } catch {
      /* настройки останутся на этот заход */
    }
    if (nextOn) void ambient.start(musicSceneFor(window.location.hash)).catch(() => undefined);
    else ambient.stop();
  }

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="На главную" onClick={() => go("#/")}>←</button>
        <h1 className="grow">Настройки</h1>
      </header>
      <main className="screen stack">
        <section className="card stack" data-testid="settings-music">
          <p className="kicker">Звук</p>
          <p>Фон выключен, пока вы сами его не включите. Выбор запоминается на этом устройстве.</p>
          <button type="button" className="btn" data-testid="settings-music-switch" onClick={() => persist(!on, volume)}>{on ? "Музыка включена" : "Музыка выключена"}</button>
          <label className="field">
            <span>Громкость</span>
            <input data-testid="settings-volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => persist(on, Number(event.target.value))} />
          </label>
        </section>
        <section className="card stack" data-testid="music-credits">
          <p className="kicker">Музыка</p>
          {MUSIC_TRACKS.map((track) => (
            <p key={track.id}><b>{track.title}.</b> {track.note} Файл: {track.file}.</p>
          ))}
          <p>{MUSIC_LICENSE_RU}</p>
          <p className="tiny">{MUSIC_LICENSE_EN}</p>
          <p><a href={MUSIC_LICENSE_LINK}>Полный текст CC0 1.0</a></p>
        </section>
      </main>
    </div>
  );
}
