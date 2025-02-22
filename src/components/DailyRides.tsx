import React from "react";
import { useDataContext } from "../context";

const _MS_PER_DAY = 1000 * 60 * 60 * 24;
import dayjs from "dayjs";
// a and b are javascript Date objects
function dateDiffInDays(a: Date, b: Date) {
  if (!a || !b) {
    return 0;
  }
  // Discard the time and time-zone information.
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}
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
          <span className={"info-value"}>{numTrips.toLocaleString()}</span> trips
          with Uber, over{" "}
          <span className={"info-value"}>{dateDiff.toLocaleString()}</span> days,
          for an average of 1 uber every{" "}
          <span className={"info-value"}>{daysBetweenUbers}</span> days
        </div>
      )}
    </div>
  );
};
