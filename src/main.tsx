import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "../css/main.css";
import "../css/all.min.css";
import { DataContextProvider } from "./context";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <DataContextProvider>
      <App />
    </DataContextProvider>
  </React.StrictMode>,
);
