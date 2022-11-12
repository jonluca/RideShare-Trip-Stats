import React from "react";
import { DailyRides } from "./components/DailyRides";
import { SpendingAndTime } from "./components/SpendingAndTime";
import Swal from "sweetalert2";
import { downloadFile } from "./utils";
import { useDataContext } from "./context";
import { json2csvAsync } from "json-2-csv";
import { cloneDeep } from "lodash-es";

function App() {
  const { data } = useDataContext();

  return (
    <div id="page-container">
      <div id="main-content">
        <div className="container">
          <h1>Lifetime</h1>
          <div className="lifetime">
            <DailyRides />
            <SpendingAndTime />
          </div>
        </div>
        <div className="buttons">
          <div
            className="button"
            id="export"
            onClick={async () => {
              let trips = Object.values(data);
              const { value } = await Swal.fire({
                title: "CSV or JSON",
                input: "radio",
                inputValue: "csv",
                inputOptions: {
                  csv: "CSV",
                  json: "JSON",
                },
              });
              if (value) {
                if (value === "csv") {
                  const cloned: any = cloneDeep(trips);
                  for (const c of cloned) {
                    delete c.trip.begin;
                    delete c.trip.end;
                  }
                  const csv = await json2csvAsync(cloned);
                  downloadFile("trips.csv", csv);
                } else if (value === "json") {
                  let json = JSON.stringify(trips);
                  downloadFile("trips.json", json);
                }
              }
            }}
          >
            Export
          </div>
        </div>
      </div>
      <footer>
        &copy; <span id="year"></span> JonLuca DeCaro & Roberto Andrade -{" "}
        <a href="https://github.com/jonluca/Uber-Trip-Stats">View Source</a>
      </footer>
    </div>
  );
}

export default App;
