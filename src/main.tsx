import { createRoot } from "react-dom/client";
import { App } from "./App";
import { APP_BUILD } from "./build-id";
import { applySkin, applyTheme, readSkin, readTheme } from "./theme";
import "./styles.css";
import "./skins.css";

const store = typeof localStorage === "undefined" ? null : localStorage;
applyTheme(readTheme(store));
applySkin(readSkin(store, typeof location === "undefined" ? "" : location.search), store);

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`./sw.js?build=${APP_BUILD}`).then((registration) => {
      void registration.update();
    }).catch(() => {
      /* офлайн-копия не обязательна для текущего сеанса */
    });
  });
}
