import React from "react";
import { useDataContext } from "../context";

import dayjs from "dayjs";

export const DailyRides = () => {
  const { data } = useDataContext();
  console.log(data);

  const numTrips = Object.keys(data || {}).length;
  const times = Object.values(data || {})
    .flatMap((entry) => (entry.trip.begin ? [entry.trip.begin] : []))
    .sort((a, b) => (dayjs(a).isAfter(dayjs(b)) ? 1 : -1));
  const firstTrip = times[0];
  const lastTrip = times.at(-1);
  const dateDiff = firstTrip && lastTrip ? lastTrip.diff(firstTrip, "days") : 0;
  const daysBetweenUbers = numTrips > 0 ? (dateDiff / numTrips).toFixed(2) : "0.00";
  return (
    <div className={"info-container"}>
      <div className={"info-header"}>Daily rides</div>
      {numTrips > 0 && (
        <div className={"info-text"} id={"daily-rides"}>
          You’ve taken <span className={"info-value"}>{numTrips.toLocaleString()}</span> trips with Uber, over{" "}
          <span className={"info-value"}>{dateDiff.toLocaleString()}</span> days, for an average of 1 uber every{" "}
          <span className={"info-value"}>{daysBetweenUbers}</span> days
        </div>
      )}
    </div>
  );
};
