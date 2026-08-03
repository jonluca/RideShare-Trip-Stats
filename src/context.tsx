import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { calculateEatsAnalytics, type EatsAnalytics } from "./analytics/eatsAnalytics";
import { calculateTripAnalytics, type TripAnalytics } from "./analytics/tripAnalytics";
import { loadEatsData, mergeEatsRecords } from "./data/eatsRepository";
import { normalizeEatsOrders, type NormalizedEatsOrder } from "./data/eatsOrders";
import { importUberDataFiles } from "./data/importUberData";
import { loadTripData, mergeTripRecords } from "./data/tripRepository";
import { normalizeTrips, type NormalizedTrip } from "./data/trips";
import type { GetTrip } from "./types/UberApi";
import type { UberEatsOrder } from "./types/UberEats";

type LoadStatus = "error" | "loading" | "ready";

export interface ExtensionContext {
  analytics: TripAnalytics | null;
  collectedAt: string | null;
  eatsAnalytics: EatsAnalytics | null;
  eatsUpdatedAt: string | null;
  eatsOrders: NormalizedEatsOrder[];
  eatsRecords: UberEatsOrder[];
  error: string | null;
  failedTripCount: number;
  importUberData: (files: readonly File[]) => Promise<ImportUberDataResult>;
  records: GetTrip[];
  status: LoadStatus;
  trips: NormalizedTrip[];
}

export interface ImportUberDataResult {
  orderDuplicates: number;
  ordersAdded: number;
  parsedRows: number;
  restaurants: number;
  skippedRows: number;
  totalOrders: number;
  totalTrips: number;
  tripDuplicates: number;
  tripsAdded: number;
}

const DataContext = React.createContext<ExtensionContext | null>(null);

export function DataContextProvider({ children }: React.PropsWithChildren) {
  const [loadedData, setLoadedData] = useState<{
    eats: Awaited<ReturnType<typeof loadEatsData>>;
    trips: Awaited<ReturnType<typeof loadTripData>>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void Promise.all([loadTripData(), loadEatsData()])
      .then(([trips, eats]) => {
        if (active) {
          setLoadedData({ eats, trips });
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

  const importUberData = useCallback(async (files: readonly File[]): Promise<ImportUberDataResult> => {
    if (files.length === 0) {
      throw new Error("Choose an Uber data ZIP or one or more Rider/Eater CSV files.");
    }

    const imported = await importUberDataFiles(files);
    const [tripResult, eatsResult] = await Promise.all([
      imported.tripSourceFiles > 0 ? mergeTripRecords(imported.records) : null,
      imported.eatsSourceFiles > 0 ? mergeEatsRecords(imported.orders, imported.restaurants, { source: "archive" }) : null,
    ]);
    const trips = tripResult?.data ?? (await loadTripData());
    const eats = eatsResult?.data ?? (await loadEatsData());
    setLoadedData({ eats, trips });
    setError(null);
    return {
      orderDuplicates: eatsResult?.duplicates ?? 0,
      ordersAdded: eatsResult?.added ?? 0,
      parsedRows: imported.parsedRows,
      restaurants: eatsResult?.restaurants ?? 0,
      skippedRows: imported.skippedRows,
      totalOrders: eats.records.length,
      totalTrips: trips.records.length,
      tripDuplicates: tripResult?.duplicates ?? 0,
      tripsAdded: tripResult?.added ?? 0,
    };
  }, []);

  const trips = useMemo(() => normalizeTrips(loadedData?.trips.records ?? []), [loadedData?.trips.records]);
  const eatsOrders = useMemo(() => normalizeEatsOrders(loadedData?.eats.records ?? []), [loadedData?.eats.records]);
  const analytics = useMemo(() => (loadedData ? calculateTripAnalytics(trips) : null), [loadedData, trips]);
  const eatsAnalytics = useMemo(() => (loadedData ? calculateEatsAnalytics(eatsOrders) : null), [eatsOrders, loadedData]);

  const value = useMemo<ExtensionContext>(
    () => ({
      analytics,
      collectedAt: loadedData?.trips.collectedAt ?? null,
      eatsAnalytics,
      eatsUpdatedAt: loadedData?.eats.updatedAt ?? null,
      eatsOrders,
      eatsRecords: loadedData?.eats.records ?? [],
      error,
      failedTripCount: loadedData?.trips.failedTripCount ?? 0,
      importUberData,
      records: loadedData?.trips.records ?? [],
      status: error ? "error" : loadedData ? "ready" : "loading",
      trips,
    }),
    [analytics, eatsAnalytics, eatsOrders, error, importUberData, loadedData, trips],
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
