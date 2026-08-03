import type { ReactNode } from "react";
import type { CountedValue, TripAnalytics, TripExtreme } from "../analytics/tripAnalytics";
import {
  formatCount,
  formatCurrency,
  formatDate,
  formatDecimal,
  formatDecimalCount,
  formatDuration,
  formatInteger,
  formatPercent,
  formatUsd,
} from "./formatters";

interface AnalyticsPanelsProps {
  analytics: TripAnalytics;
}

function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="data-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function TripLink({ extreme, format }: { extreme: TripExtreme | null; format: (value: number) => string }) {
  if (!extreme) {
    return <>—</>;
  }
  return (
    <a href={`https://riders.uber.com/trips/${encodeURIComponent(extreme.uuid)}`} target="_blank" rel="noreferrer">
      {format(extreme.value)} ↗
    </a>
  );
}

function CountList({ values, limit = 6 }: { limit?: number; values: CountedValue[] }) {
  const maximum = Math.max(...values.map((entry) => entry.count), 1);
  return (
    <div className="count-list">
      {values.slice(0, limit).map((entry) => (
        <div className="count-row" key={entry.label}>
          <span>{entry.label}</span>
          <span className="count-track" aria-hidden="true">
            <span style={{ width: `${(entry.count / maximum) * 100}%` }} />
          </span>
          <strong>{formatInteger(entry.count)}</strong>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsPanels({ analytics }: AnalyticsPanelsProps) {
  return (
    <div className="analytics-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Patterns</span>
            <h2>Your ride rhythm</h2>
          </div>
        </div>
        <dl className="data-list">
          <DataRow
            label="Busiest month"
            value={analytics.busiestMonth ? `${analytics.busiestMonth.label} · ${formatCount(analytics.busiestMonth.count, "ride")}` : "—"}
          />
          <DataRow label="Most common day" value={analytics.busiestWeekday ? `${analytics.busiestWeekday.label}s` : "—"} />
          <DataRow
            label="Average cadence"
            value={analytics.averageDaysBetweenTrips === null ? "—" : `Every ${formatDecimal(analytics.averageDaysBetweenTrips)} days`}
          />
          <DataRow
            label="Monthly pace"
            value={analytics.averageTripsPerMonth === null ? "—" : formatDecimalCount(analytics.averageTripsPerMonth, "ride")}
          />
          <DataRow label="Completion rate" value={analytics.completionRate === null ? "—" : formatPercent(analytics.completionRate)} />
        </dl>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Records</span>
            <h2>Trip highlights</h2>
          </div>
        </div>
        <dl className="data-list">
          <DataRow label="First ride" value={analytics.firstTripTime === null ? "—" : formatDate(analytics.firstTripTime)} />
          <DataRow label="Latest ride" value={analytics.lastTripTime === null ? "—" : formatDate(analytics.lastTripTime)} />
          <DataRow label="Shortest ride" value={<TripLink extreme={analytics.shortestTrip} format={formatDuration} />} />
          <DataRow label="Longest ride" value={<TripLink extreme={analytics.longestTrip} format={formatDuration} />} />
          <DataRow label="Lowest fare" value={<TripLink extreme={analytics.minFare} format={formatUsd} />} />
          <DataRow label="Highest fare" value={<TripLink extreme={analytics.maxFare} format={formatUsd} />} />
        </dl>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Spending</span>
            <h2>Currency breakdown</h2>
          </div>
          {analytics.averageFareUsd !== null && <span className="panel-note">~{formatUsd(analytics.averageFareUsd)} average</span>}
        </div>
        {analytics.currencyTotals.length === 0 ? (
          <p className="panel-empty">No fare data was returned for these trips.</p>
        ) : (
          <div className="currency-list">
            {analytics.currencyTotals.map((total) => (
              <div className="currency-row" key={total.currency}>
                <span className="currency-code">{total.currency}</span>
                <strong>{formatCurrency(total.amount, total.currency)}</strong>
                <span>{total.currency === "USD" || total.usdAmount === null ? "" : `~${formatUsd(total.usdAmount)}`}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Mix</span>
            <h2>What you ride</h2>
          </div>
        </div>
        <CountList values={analytics.vehicleTypes} />
        <div className="flag-grid">
          <span>
            <strong>{formatInteger(analytics.flags.surge)}</strong> surge
          </span>
          <span>
            <strong>{formatInteger(analytics.flags.pool)}</strong> shared
          </span>
          <span>
            <strong>{formatInteger(analytics.flags.reserve)}</strong> reserved
          </span>
          <span>
            <strong>{formatInteger(analytics.flags.scheduled)}</strong> scheduled
          </span>
        </div>
      </section>
    </div>
  );
}
