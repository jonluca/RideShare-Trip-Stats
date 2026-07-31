import React from "react";
import ReactDOM from "react-dom/client";
import App from "../../src/App";
import "../../css/main.css";
import { DataContextProvider } from "../../src/context";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <DataContextProvider>
      <App />
    </DataContextProvider>
  </React.StrictMode>,
);
