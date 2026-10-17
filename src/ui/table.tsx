import { useState } from "react";
import { sheetDnd } from "../dnd/build";
import { armorClass, hpMax } from "../rules";
import { CAMPAIGN_KEY, PROFILE_KEY, campaignFile, readCampaigns, readProfiles, tableSummary, type Campaign, type LocalProfile } from "../table";
import type { Character } from "../types";
import { uid } from "../types";
import { portraitSrc } from "./art";
import { go } from "./common";
import { sheetDerived } from "./remaster";

function loadProfiles(): LocalProfile[] {
  try {
    return readProfiles(localStorage.getItem(PROFILE_KEY));
  } catch {
    return [];
  }
}

function loadCampaigns(): Campaign[] {
  try {
    return readCampaigns(localStorage.getItem(CAMPAIGN_KEY));
  } catch {
    return [];
  }
}

export function Table({ characters }: { characters: Character[] }) {
  const [profiles, setProfiles] = useState<LocalProfile[]>(loadProfiles);
  const [campaigns, setCampaigns] = useState<Campaign[]>(loadCampaigns);
  const [profileName, setProfileName] = useState("");
  const [profileRole, setProfileRole] = useState<"player" | "gm">("player");
  const [campaignName, setCampaignName] = useState("");
  const [openId, setOpenId] = useState<string | null>(campaigns[0]?.id ?? null);
  const [message, setMessage] = useState("");
  const open = campaigns.find((item) => item.id === openId) ?? null;

  function saveProfiles(next: LocalProfile[]) {
    setProfiles(next);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  }

  function saveCampaigns(next: Campaign[]) {
    setCampaigns(next);
    localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(next));
  }

  function addProfile() {
    const name = profileName.trim();
    if (!name) return;
    saveProfiles([...profiles, { id: uid(), name, role: profileRole }]);
    setProfileName("");
  }

  function addCampaign() {
    const name = campaignName.trim();
    if (!name) return;
    const campaign: Campaign = { id: uid(), name, note: "", seats: [] };
    saveCampaigns([campaign, ...campaigns]);
    setOpenId(campaign.id);
    setCampaignName("");
  }

  function patch(campaign: Campaign) {
    saveCampaigns(campaigns.map((item) => (item.id === campaign.id ? campaign : item)));
  }

  function toggleSeat(campaign: Campaign, characterId: string) {
    const exists = campaign.seats.some((seat) => seat.characterId === characterId);
    const seats = exists
      ? campaign.seats.filter((seat) => seat.characterId !== characterId)
      : [...campaign.seats, { characterId, playerName: profiles.find((profile) => profile.role === "player")?.name ?? "" }];
    patch({ ...campaign, seats });
  }

  function download(campaign: Campaign) {
    const blob = new Blob([campaignFile(campaign, profiles, characters)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rpg-hero-table.json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Файл стола скачан. Он остаётся у вас: сайт никого не публикует.");
  }

  async function copySummary(campaign: Campaign) {
    const text = tableSummary(campaign, characters);
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Сводка скопирована. Её можно отправить игрокам самим, сайт этого не делает.");
    } catch {
      setMessage(text);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="На главную" onClick={() => go("#/")}>←</button>
        <h1 className="grow">Стол</h1>
      </header>
      <main className="screen stack">
        <figure className="figure-card">
          <img src={`${import.meta.env.BASE_URL}art/hero-tavern-party.jpg`} alt="Компания у ночной таверны, свой рисунок" />
        </figure>
        <p className="lead">Несколько людей на этом телефоне: имена игроков и стол ведущего. Лист правит тот, кто его открыл. В сеть герои не уходят.</p>
        <section className="card stack">
          <b>Кто за столом</b>
          {profiles.length === 0 && <p className="tiny">Пока только этот браузер. Добавьте имя игрока или ведущего.</p>}
          {profiles.map((profile) => (
            <div key={profile.id} className="row-between">
              <span>{profile.name} · {profile.role === "gm" ? "ведущий" : "игрок"}</span>
              <button type="button" className="text-btn" onClick={() => saveProfiles(profiles.filter((item) => item.id !== profile.id))}>Убрать</button>
            </div>
          ))}
          <input placeholder="Имя" value={profileName} onChange={(event) => setProfileName(event.target.value)} />
          <div className="seg">
            <button type="button" className={`pill ${profileRole === "player" ? "on" : ""}`} onClick={() => setProfileRole("player")}>Игрок</button>
            <button type="button" className={`pill ${profileRole === "gm" ? "on" : ""}`} onClick={() => setProfileRole("gm")}>Ведущий</button>
          </div>
          <button type="button" className="btn" onClick={addProfile}>Добавить имя</button>
        </section>
        <section className="card stack">
          <b>Кампания на этом телефоне</b>
          <input placeholder="Название стола" value={campaignName} onChange={(event) => setCampaignName(event.target.value)} />
          <button type="button" className="btn primary" data-testid="add-campaign" onClick={addCampaign}>Создать стол</button>
          {campaigns.map((campaign) => (
            <button key={campaign.id} type="button" className={`pill ${campaign.id === openId ? "on" : ""}`} onClick={() => setOpenId(campaign.id)}>
              {campaign.name}
            </button>
          ))}
        </section>
        {open && (
          <section className="card stack" data-testid="gm-table">
            <b>Вид ведущего: {open.name}</b>
            <textarea placeholder="Заметка стола, в расчёт не входит" value={open.note} onChange={(event) => patch({ ...open, note: event.target.value })} />
            <p className="tiny">Отметьте героев, которые сидят за этим столом. Чужие телефоны сами этот список не увидят.</p>
            {characters.length === 0 && <p>На телефоне ещё нет героев. Создайте лист или загрузите файл.</p>}
            {characters.map((hero) => {
              const seat = open.seats.find((item) => item.characterId === hero.id);
              return (
                <div key={hero.id} className="stack">
                  <button type="button" className={`pill ${seat ? "on" : ""}`} onClick={() => toggleSeat(open, hero.id)}>
                    {hero.name}
                  </button>
                  {seat && (
                    <>
                      <input
                        placeholder="Имя игрока"
                        value={seat.playerName}
                        onChange={(event) => patch({
                          ...open,
                          seats: open.seats.map((item) => (item.characterId === hero.id ? { ...item, playerName: event.target.value } : item)),
                        })}
                      />
                      <GmCard hero={hero} playerName={seat.playerName} />
                    </>
                  )}
                </div>
              );
            })}
            <div className="row">
              <button type="button" className="btn" onClick={() => download(open)}>Выгрузить стол</button>
              <button type="button" className="btn" onClick={() => void copySummary(open)}>Скопировать сводку</button>
            </div>
            <button type="button" className="text-btn" onClick={() => { saveCampaigns(campaigns.filter((item) => item.id !== open.id)); setOpenId(null); }}>
              Удалить стол
            </button>
          </section>
        )}
        {message && <p className="warn">{message}</p>}
      </main>
    </div>
  );
}

function GmCard({ hero, playerName }: { hero: Character; playerName: string }) {
  const derived = sheetDerived(hero);
  const dnd = sheetDnd(hero);
  const max = derived?.hp.value ?? dnd?.hp.value ?? hpMax(hero);
  const ac = derived?.ac.value ?? dnd?.ac.value ?? armorClass(hero).value;
  const drawn = hero.photo ?? portraitSrc(hero.ancestryId, hero.classId);
  return (
    <article className="card portrait-home">
      {drawn ? <img className="avatar" src={drawn} alt="" /> : <div className="avatar" aria-hidden>⚔</div>}
      <div>
        <b>{hero.name}</b>
        <p className="tiny">{playerName || "Игрок не подписан"} · {hero.ancestryName} · {hero.className} · {hero.level} ур.</p>
        <p className="tiny">Хиты {hero.hpCurrent}/{max} · КБ {ac} · {hero.system === "pf2e" ? `очки героизма ${hero.hero}` : `вдохновение ${hero.hero > 0 ? "есть" : "нет"}`}</p>
        <button type="button" className="text-btn" onClick={() => go(`#/c/${hero.id}`)}>Открыть лист</button>
      </div>
    </article>
  );
}
