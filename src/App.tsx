import { useRef, useState } from "react";
import { EatsDashboard } from "./components/EatsDashboard";
import { formatCount, formatInteger } from "./components/formatters";
import { RideDashboard } from "./components/RideDashboard";
import { useDataContext, type ImportUberDataResult } from "./context";

const UBER_TRIPS_URL = "https://riders.uber.com/trips";
type DashboardView = "eats" | "rides";
type ImportState = "error" | "idle" | "loading" | "success";

function PageHeader() {
  return (
    <header className="dashboard-header">
      <a className="brand" href={UBER_TRIPS_URL} target="_blank" rel="noreferrer">
        <span className="brand-mark" aria-hidden="true">
          R
        </span>
        <span>RideShare Trip Stats</span>
      </a>
      <span className="local-badge">
        <span aria-hidden="true">●</span> Analyzed locally
      </span>
    </header>
  );
}

function LoadingState() {
  return (
    <main className="loading-page" aria-live="polite" aria-busy="true">
      <div className="loading-mark" aria-hidden="true">
        <span />
      </div>
      <p>Preparing your lifetime analytics…</p>
    </main>
  );
}

function ImportStatus({ message, state }: { message: string | null; state: ImportState }) {
  if (!message) {
    return null;
  }
  return (
    <aside className={`notice notice-import-${state} import-status`} role={state === "error" ? "alert" : "status"}>
      <span aria-hidden="true">{state === "error" ? "!" : state === "loading" ? "…" : "✓"}</span>
      <p>{message}</p>
    </aside>
  );
}

function EmptyState({
  error,
  importLoading,
  importMessage,
  importState,
  onImport,
}: {
  error?: string | null;
  importLoading: boolean;
  importMessage: string | null;
  importState: ImportState;
  onImport: () => void;
}) {
  return (
    <main className="state-page">
      <div className="state-card">
        <span className="state-icon" aria-hidden="true">
          ↗
        </span>
        <p className="eyebrow">{error ? "Something went wrong" : "No Uber history yet"}</p>
        <h1>{error ? "We couldn’t open your results." : "Analyze rides or import your Uber history."}</h1>
        <p>
          {error ??
            "Run the extension from Uber Trips for live ride data, or import your official Uber data ZIP for older rides and Uber Eats orders."}
        </p>
        <ImportStatus message={importMessage} state={importState} />
        <div className="state-actions">
          <button className="primary-button" type="button" disabled={importLoading} onClick={onImport}>
            {importLoading ? "Importing…" : "Import Uber data"} <span aria-hidden="true">＋</span>
          </button>
          <a className="secondary-link" href={UBER_TRIPS_URL} target="_blank" rel="noreferrer">
            Open Uber Trips ↗
          </a>
        </div>
      </div>
    </main>
  );
}

function DashboardTabs({
  active,
  eatsCount,
  onChange,
  rideCount,
}: {
  active: DashboardView;
  eatsCount: number;
  onChange: (view: DashboardView) => void;
  rideCount: number;
}) {
  return (
    <nav className="dashboard-tabs" aria-label="Analytics view">
      <button
        className={active === "rides" ? "is-active" : ""}
        type="button"
        aria-pressed={active === "rides"}
        onClick={() => onChange("rides")}
      >
        <span>Rides</span>
        <strong>{formatInteger(rideCount)}</strong>
      </button>
      <button
        className={active === "eats" ? "is-active" : ""}
        type="button"
        aria-pressed={active === "eats"}
        onClick={() => onChange("eats")}
      >
        <span>Uber Eats</span>
        <strong>{formatInteger(eatsCount)}</strong>
      </button>
    </nav>
  );
}

function ViewEmptyState({ importLoading, onImport, view }: { importLoading: boolean; onImport: () => void; view: DashboardView }) {
  const rides = view === "rides";
  return (
    <section className="view-empty">
      <span className="panel-kicker">{rides ? "Rides" : "Uber Eats"}</span>
      <h1>{rides ? "No ride data yet." : "No Eats orders imported yet."}</h1>
      <p>
        {rides
          ? "Open Uber Trips to run the live collector, or import the Rider CSV from your official Uber data archive."
          : "Import your official Uber data ZIP, or select Eats Order Details and Eats Restaurant Names CSV files together."}
      </p>
      <div className="state-actions">
        <button className="primary-button" type="button" disabled={importLoading} onClick={onImport}>
          {importLoading ? "Importing…" : "Import Uber data"} <span aria-hidden="true">＋</span>
        </button>
        {rides && (
          <a className="secondary-link" href={UBER_TRIPS_URL} target="_blank" rel="noreferrer">
            Open Uber Trips ↗
          </a>
        )}
      </div>
    </section>
  );
}

function importResultMessage(result: ImportUberDataResult): string {
  const added: string[] = [];
  if (result.tripsAdded > 0) {
    added.push(formatCount(result.tripsAdded, "ride"));
  }
  if (result.ordersAdded > 0) {
    added.push(formatCount(result.ordersAdded, "Eats order"));
  }
  const duplicates = result.tripDuplicates + result.orderDuplicates;
  const duplicateRecords = formatCount(duplicates, "duplicate record");
  const skippedRows = result.skippedRows > 0 ? ` ${formatCount(result.skippedRows, "row")} could not be read.` : "";
  if (added.length > 0) {
    return `Added ${added.join(" and ")}. ${duplicateRecords} ${duplicates === 1 ? "was" : "were"} merged.${skippedRows}`;
  }
  if (result.restaurants > 0) {
    return `Updated restaurant details for your Eats history. ${formatCount(duplicates, "existing record")} ${duplicates === 1 ? "was" : "were"} merged.${skippedRows}`;
  }
  return `No new records were added. ${formatCount(duplicates, "imported record")} ${duplicates === 1 ? "was" : "were"} already present.${skippedRows}`;
}

export default function App() {
  const {
    analytics,
    collectedAt,
    eatsAnalytics,
    eatsImportedAt,
    eatsRecords,
    error,
    failedTripCount,
    importUberData,
    records,
    status,
    trips,
  } = useDataContext();
  const importInput = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importState, setImportState] = useState<ImportState>("idle");
  const [selectedView, setSelectedView] = useState<DashboardView | null>(null);

  const rideCount = analytics?.totalTrips ?? 0;
  const eatsCount = eatsAnalytics?.totalOrders ?? 0;
  const activeView = selectedView ?? (rideCount > 0 ? "rides" : eatsCount > 0 ? "eats" : "rides");
  const importLoading = importState === "loading";

  const handleImport = async (files: FileList | null) => {
    const selectedFiles = files ? Array.from(files) : [];
    if (selectedFiles.length === 0) {
      return;
    }

    setImportState("loading");
    setImportMessage("Reading your Uber export locally…");
    try {
      const result = await importUberData(selectedFiles);
      setImportState("success");
      setImportMessage(importResultMessage(result));
      if (result.ordersAdded > 0 && result.tripsAdded === 0) {
        setSelectedView("eats");
      }
    } catch (reason) {
      setImportState("error");
      setImportMessage(reason instanceof Error ? reason.message : "Could not read this Uber data export.");
    } finally {
      if (importInput.current) {
        importInput.current.value = "";
      }
    }
  };

  const openImport = () => importInput.current?.click();
  const input = (
    <input
      ref={importInput}
      hidden
      multiple
      type="file"
      accept=".zip,.csv,application/zip,text/csv"
      onChange={(event) => void handleImport(event.currentTarget.files)}
    />
  );

  if (status === "loading") {
    return (
      <>
        <PageHeader />
        <LoadingState />
      </>
    );
  }

  if (status === "error" || rideCount + eatsCount === 0) {
    return (
      <>
        <PageHeader />
        {input}
        <EmptyState
          error={error}
          importLoading={importLoading}
          importMessage={importMessage}
          importState={importState}
          onImport={openImport}
        />
      </>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader />
      {input}
      <main className="dashboard-main">
        <DashboardTabs active={activeView} eatsCount={eatsCount} onChange={setSelectedView} rideCount={rideCount} />

        <ImportStatus message={importMessage} state={importState} />

        {activeView === "rides" && analytics && analytics.totalTrips > 0 ? (
          <RideDashboard
            analytics={analytics}
            collectedAt={collectedAt}
            failedTripCount={failedTripCount}
            importLoading={importLoading}
            onImport={openImport}
            records={records}
            trips={trips}
          />
        ) : activeView === "eats" && eatsAnalytics && eatsAnalytics.totalOrders > 0 ? (
          <EatsDashboard
            analytics={eatsAnalytics}
            importedAt={eatsImportedAt}
            importLoading={importLoading}
            onImport={openImport}
            orders={eatsRecords}
          />
        ) : (
          <ViewEmptyState importLoading={importLoading} onImport={openImport} view={activeView} />
        )}
      </main>

      <footer className="dashboard-footer">
        <span>Stored only in this browser</span>
        <span>Not affiliated with Uber</span>
        <a href="https://github.com/jonluca/RideShare-Trip-Stats" target="_blank" rel="noreferrer">
          View source ↗
        </a>
      </footer>
    </div>
  );
}
