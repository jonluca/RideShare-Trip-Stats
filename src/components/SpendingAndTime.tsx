import React, { Fragment } from "react";
import { useDataContext } from "../context";
import { getCurrencyConversionIfExists, getSymbolFromCode } from "../utils/currencies";

function capitalize(value: string) {
  return value.length === 0 ? value : value[0]!.toUpperCase() + value.slice(1);
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function getSortedKeysFromObject(obj: any, reverse = false) {
  const keys = Object.keys(obj);
  keys.sort((a, b) => {
    const usdEquivA = getCurrencyConversionIfExists(a, obj[a]);
    const usdEquivB = getCurrencyConversionIfExists(b, obj[b]);

    if (reverse) {
      return usdEquivB - usdEquivA;
    }
    return usdEquivA - usdEquivB;
  });
  return keys;
}

export const SpendingAndTime = () => {
  const { data } = useDataContext();

  const totals: Record<string, number> = {};
  let totalAcrossAllCurrencies = 0;
  let completedTrips = 0;
  let minSpent = 999999;
  let maxSpent = -1;
  const trips = Object.values(data);
  for (const trip of trips) {
    const { currency = "USD", fareAmount, status, usdAmount } = trip.trip;
    totals[currency] ??= 0;
    totals[currency] += fareAmount;
    totalAcrossAllCurrencies += usdAmount;
    if (usdAmount) {
      minSpent = Math.min(minSpent, usdAmount);
      maxSpent = Math.max(maxSpent, usdAmount);
    }

    if (status === "COMPLETED") {
      completedTrips++;
    }
  }

  const val = totalAcrossAllCurrencies;

  const currencyKeys = getSortedKeysFromObject(totals, true);

  const tripLengths = trips.map((l) => ({
    time: l.trip.end.diff(l.trip.begin) || 0,
    uuid: l.trip.uuid,
  }));
  tripLengths.sort((a, b) => a.time - b.time);
  const shortestTrip = tripLengths[0];
  const shortestTime = shortestTrip ? Math.abs(Math.round(shortestTrip.time / (60 * 1000))) : 0;
  const longestTrip = tripLengths[tripLengths.length - 1];
  const longestTime = longestTrip ? Math.abs(Math.round(longestTrip.time / (60 * 1000))) : 0;

  let totalTime = 0;
  for (const time of tripLengths) {
    totalTime += time.time;
  }

  const countedByType: Record<string, number> = {};
  for (const trip of trips) {
    const vehicleType = trip.trip.vehicleDisplayName?.split(":")[0]?.toLowerCase() || "unknown";
    countedByType[vehicleType] = (countedByType[vehicleType] ?? 0) + 1;
  }

  const surge = trips.filter((t) => t.trip.isSurgeTrip).length;
  const reserve = trips.filter((t) => t.trip.isUberReserve).length;
  const scheduled = trips.filter((t) => t.trip.isScheduledRide).length;
  const rideshare = trips.filter((t) => t.trip.isRidepoolTrip).length;
  let totalDistance = 0;
  for (const trip of trips) {
    if (!trip.receipt) {
      continue;
    }
    const { distance, distanceLabel } = trip.receipt;
    const distanceNum = parseFloat(distance) || 0;
    if (distanceLabel === "miles") {
      totalDistance += distanceNum;
    } else if (distanceLabel === "kilometers") {
      totalDistance += distanceNum * 0.621371;
    }
  }

  return (
    <div
      className={"stats-view"}
      style={{
        display: "flex",
        flexDirection: "column",
        flexWrap: "wrap",
        maxHeight: 800,
        padding: 4,
        margin: 4,
      }}
    >
      <div className={"individual-stat"}>
        <span>Total Spent</span>
        <span className={"stat"} id={"total-payment"}>
          {usdFormatter.format(val)}
        </span>
        <div id={"total-spent"}>
          {currencyKeys.map((key) => {
            const currencySymbol = getSymbolFromCode(key);
            const total = totals[key] ?? 0;
            const usdEquiv = getCurrencyConversionIfExists(key, total);
            return (
              <Fragment key={key}>
                <span className={"subheading"}>{key}</span>
                <span className={"stat"}>
                  {currencySymbol + total.toLocaleString()}{" "}
                  {usdEquiv && <span style={{ fontSize: 12 }}>({usdFormatter.format(usdEquiv)} USD)</span>}
                </span>
                <br />
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className={"individual-stat"}>
        <span>Average Price</span>
        <span className={"stat"} id={"average-price"}>
          ~${(completedTrips > 0 ? totalAcrossAllCurrencies / completedTrips : 0).toFixed(2)}
        </span>
      </div>
      {maxSpent > 0 && (
        <div className={"individual-stat"}>
          <span>Max Price</span>
          <span className={"stat"} id={"max-price"}>
            ~${maxSpent.toFixed(2)}
          </span>
        </div>
      )}
      {minSpent > 0 && (
        <div className={"individual-stat"}>
          <span>Min Price</span>
          <span className={"stat"} id={"min-price"}>
            ~${minSpent.toFixed(2)}
          </span>
        </div>
      )}
      {totalDistance !== 0 && (
        <div className={"individual-stat"}>
          <span>Total Distance</span>
          <span className={"stat"} id={"total-payment"} style={{ marginLeft: 2 }}>
            {totalDistance.toLocaleString()} miles
          </span>
        </div>
      )}
      <div className={"individual-stat"}>
        <span>Total Time</span>
        <div id={"total-time"}>
          <span className={"subheading"}>Seconds</span>
          <span className={"stat"}> {Math.round((totalTime /= 1000)).toLocaleString()}</span>
          <br />

          {totalTime > 60 && (
            <>
              <span className={"subheading"}>Minutes</span>
              <span id={"minutes"} className={"stat"}>
                {Math.round((totalTime /= 60)).toLocaleString()}
              </span>
              <br />
            </>
          )}
          {totalTime > 60 && (
            <>
              <span className={"subheading"}>Hours</span>
              <span id={"hours"} className={"stat"}>
                {" "}
                {Math.round((totalTime /= 60)).toLocaleString()}
              </span>
              <br />
            </>
          )}

          {totalTime > 24 && (
            <>
              <span className={"subheading"}>Days</span>
              <span className={"stat"}> {(totalTime / 24).toFixed(2)}</span>
              <br />
            </>
          )}
        </div>
      </div>
      {shortestTrip && (
        <div className={"individual-stat"}>
          <span>Shortest Time</span>
          <span className={"stat"} style={{ marginLeft: 4 }} id={"shortest-ride"}>
            <a target={"_blank"} className={"link"} href={`https://riders.uber.com/trips/${shortestTrip.uuid}`}>
              {shortestTime} minutes
            </a>
          </span>
        </div>
      )}
      {longestTrip && (
        <div className={"individual-stat"}>
          <span>Longest Time</span>
          <span className={"stat"} style={{ marginLeft: 4 }} id={"longest-ride"}>
            <a target={"_blank"} className={"link"} href={`https://riders.uber.com/trips/${longestTrip.uuid}`}>
              {longestTime} minutes
            </a>
          </span>
        </div>
      )}
      <div className={"individual-stat"}>
        <span>Ride Types</span>
        <div id={"total-spent"}>
          <span className={"subheading"}>Surge</span>
          <span className={"stat"}>
            {surge.toLocaleString()} Ride{surge === 1 ? "" : "s"}
          </span>
          <br />
          <span className={"subheading"}>Rideshare</span>
          <span className={"stat"}>
            {rideshare.toLocaleString()} Ride{rideshare === 1 ? "" : "s"}
          </span>
          <br />
          <span className={"subheading"}>Reserved</span>
          <span className={"stat"}>
            {reserve.toLocaleString()} Ride{reserve === 1 ? "" : "s"}
          </span>
          <br />
          <span className={"subheading"}>Scheduled</span>
          <span className={"stat"}>
            {scheduled.toLocaleString()} Ride{scheduled === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      <div className={"individual-stat"}>
        <span>Rides</span>
        <div id={"total-spent"}>
          {Object.keys(countedByType)
            .sort((a, b) => (countedByType[b] ?? 0) - (countedByType[a] ?? 0))
            .map((key) => {
              const numRides = countedByType[key] ?? 0;
              return (
                <Fragment key={key}>
                  <span className={"subheading"}>{capitalize(key)}</span>
                  <span className={"stat"}>
                    {numRides.toLocaleString()} Ride
                    {numRides === 1 ? "" : "s"}
                  </span>
                  <br />
                </Fragment>
              );
            })}
        </div>
      </div>
    </div>
  );
};
