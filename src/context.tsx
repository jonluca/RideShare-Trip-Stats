import * as React from "react";
import { useEffect, useState } from "react";
import { browser } from "webextension-polyfill-ts";
import { GetTrip, GetTrips, Trip } from "./types/UberApi";
import dayjs, { Dayjs } from "dayjs";
import parseCurrency from "parse-money";
import { getCurrencyConversionIfExists } from "./utils/currencies";

interface CustomTrip extends Trip {
  begin: Dayjs;
  end: Dayjs;
  usdAmount: number;
  currency: string;
  fareAmount: number;
  lengthMs: number;
}
interface CustomGetTrip extends GetTrip {
  trip: CustomTrip;
}
export interface ExtensionContext {
  data: Record<string, CustomGetTrip>;
}

const DataContext = React.createContext<ExtensionContext>({
  data: {},
});

const DataContextProvider = (props: React.PropsWithChildren) => {
  const [data, setData] = useState<Record<string, CustomGetTrip>>({});

  useEffect(() => {
    const run = async () => {
      const data: Record<string, CustomGetTrip> =
        await browser.runtime.sendMessage({ requestData: true });
      for (const entry of Object.values(data)) {
        entry.trip.begin = dayjs(entry.trip.beginTripTime);
        entry.trip.end = dayjs(entry.trip.dropoffTime);
        entry.trip.lengthMs =
          entry.trip.end.toDate().getTime() -
          entry.trip.begin.toDate().getTime();
        let fare = entry.trip.fare;
        let money = parseCurrency(fare)!;
        if (money && fare.startsWith("CA")) {
          // @ts-ignore
          money.currency = "CAD";
        }
        if (money && fare.startsWith("HK")) {
          // @ts-ignore
          money.currency = "HKD";
        }
        if (money && fare.startsWith("COP")) {
          // @ts-ignore
          money.currency = "COP";
        }
        if (money && fare.startsWith("MX")) {
          // @ts-ignore
          money.currency = "MX";
        }
        entry.trip.currency = money?.currency! || "USD";
        entry.trip.fareAmount = money?.amount || 0;
        const usdEquivalentAmount = getCurrencyConversionIfExists(
          entry.trip.currency,
          entry.trip.fareAmount
        );
        entry.trip.usdAmount = usdEquivalentAmount;
      }
      setData(data);
    };
    run();
  }, []);

  return (
    <DataContext.Provider
      value={{
        data,
      }}
    >
      {props.children}
    </DataContext.Provider>
  );
};

const useDataContext = () => React.useContext(DataContext);

export { DataContextProvider, useDataContext };
