import React from "react";
import { useDataContext } from "../context";

import dayjs from "dayjs";

export const DailyRides = () => {
  const { data } = useDataContext();
  console.log(data);

  const numTrips = Object.keys(data || {}).length;
  const times = Object.values(data || {})
    .map((e) => e?.trip?.begin!)
    .filter(Boolean)
    .sort((a, b) => (dayjs(a).isAfter(dayjs(b)) ? 1 : -1));
  const dateDiff = times[times.length - 1]?.diff(times[0], "days");
  const daysBetweenUbers = (dateDiff / numTrips).toFixed(2);
  return (
    <div className={"info-container"}>
      <div className={"info-header"}>Daily rides</div>
      {numTrips && (
        <div className={"info-text"} id={"daily-rides"}>
          You’ve taken{" "}
          <span className={"info-value"}>{numTrips.toLocaleString()}</span>{" "}
          trips with Uber, over{" "}
          <span className={"info-value"}>{dateDiff.toLocaleString()}</span>{" "}
          days, for an average of 1 uber every{" "}
          <span className={"info-value"}>{daysBetweenUbers}</span> days
        </div>
      )}
    </div>
  );
};
