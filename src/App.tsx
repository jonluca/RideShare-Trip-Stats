import React from "react";
import { DailyRides } from "./components/DailyRides";
import { SpendingAndTime } from "./components/SpendingAndTime";
import { downloadFile } from "./utils";
import { useDataContext } from "./context";
import { json2csv } from "json-2-csv";

function App() {
  const { data } = useDataContext();

  const exportTrips = (format: "csv" | "json") => {
    const trips = Object.values(data);

    if (format === "csv") {
      const csvTrips = trips.map(({ trip, ...entry }) => {
        const { begin: _begin, end: _end, ...tripData } = trip;
        return { ...entry, trip: tripData };
      });
      downloadFile("trips.csv", json2csv(csvTrips));
      return;
    }

    downloadFile("trips.json", JSON.stringify(trips));
  };

  return (
    <div id={"page-container"}>
      <div id={"main-content"}>
        <div className={"container"}>
          <h1>Lifetime</h1>
          <div className={"lifetime"}>
            <DailyRides />
            <SpendingAndTime />
          </div>
        </div>
        <div className={"buttons"}>
          <button type={"button"} className={"button"} onClick={() => exportTrips("csv")}>
            Export CSV
          </button>
          <button type={"button"} className={"button"} onClick={() => exportTrips("json")}>
            Export JSON
          </button>
        </div>
      </div>
      <footer>
        &copy; <span id={"year"}></span> JonLuca DeCaro & Roberto Andrade -{" "}
        <a href={"https://github.com/jonluca/Uber-Trip-Stats"}>View Source</a>
      </footer>
    </div>
  );
}

export default App;
