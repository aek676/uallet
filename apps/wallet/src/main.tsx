import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "#/app/app";
import { localizeDocument } from "#/lib/i18n";

import "./styles.css";

localizeDocument();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
