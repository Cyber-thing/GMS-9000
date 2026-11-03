import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { LangProvider } from "./i18n";
import { GameProvider } from "./game/state";
import { TutorialProvider } from "./game/tutorial";
import { store } from "./lib/util";

/* Применить сохранённый цвет интерфейса (зелёный / маджента) до первого кадра. */
document.documentElement.dataset.phos = store.get("phos", "green");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LangProvider>
      <GameProvider>
        <TutorialProvider>
          <App />
        </TutorialProvider>
      </GameProvider>
    </LangProvider>
  </StrictMode>
);
