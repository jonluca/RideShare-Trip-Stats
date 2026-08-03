import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { calculateTripAnalytics, type TripAnalytics } from "./analytics/tripAnalytics";
import { loadTripData } from "./data/tripRepository";
import { normalizeTrips, type NormalizedTrip } from "./data/trips";
import type { GetTrip } from "./types/UberApi";

type LoadStatus = "error" | "loading" | "ready";

export interface ExtensionContext {
  analytics: TripAnalytics | null;
  collectedAt: string | null;
  error: string | null;
  failedTripCount: number;
  records: GetTrip[];
  status: LoadStatus;
  trips: NormalizedTrip[];
}

const DataContext = React.createContext<ExtensionContext | null>(null);

export function DataContextProvider({ children }: React.PropsWithChildren) {
  const [loadedData, setLoadedData] = useState<Awaited<ReturnType<typeof loadTripData>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void loadTripData()
      .then((data) => {
        if (active) {
          setLoadedData(data);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Could not read your locally stored trip data.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const trips = useMemo(() => normalizeTrips(loadedData?.records ?? []), [loadedData?.records]);
  const analytics = useMemo(() => (loadedData ? calculateTripAnalytics(trips) : null), [loadedData, trips]);

  const value = useMemo<ExtensionContext>(
    () => ({
      analytics,
      collectedAt: loadedData?.collectedAt ?? null,
      error,
      failedTripCount: loadedData?.failedTripCount ?? 0,
      records: loadedData?.records ?? [],
      status: error ? "error" : loadedData ? "ready" : "loading",
      trips,
    }),
    [analytics, error, loadedData, trips],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDataContext(): ExtensionContext {
  const context = React.useContext(DataContext);
  if (!context) {
    throw new Error("useDataContext must be used inside DataContextProvider");
  }
  return context;
}
