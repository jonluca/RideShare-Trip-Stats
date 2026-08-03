import type { EatsAnalytics, EatsCountedValue } from "../analytics/eatsAnalytics";
import { formatCount, formatCurrency, formatDecimal, formatDecimalCount, formatInteger, formatPercent, formatUsd } from "./formatters";

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="data-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CountList({ empty, values, limit = 7 }: { empty: string; limit?: number; values: EatsCountedValue[] }) {
  if (values.length === 0) {
    return <p className="panel-empty">{empty}</p>;
  }
  const maximum = Math.max(...values.map((entry) => entry.count), 1);
  return (
    <div className="count-list">
      {values.slice(0, limit).map((entry) => (
        <div className="count-row" key={entry.label}>
          <span title={entry.label}>{entry.label}</span>
          <span className="count-track" aria-hidden="true">
            <span style={{ width: `${(entry.count / maximum) * 100}%` }} />
          </span>
          <strong>{formatInteger(entry.count)}</strong>
        </div>
      ))}
    </div>
  );
}

export function EatsAnalyticsPanels({ analytics }: { analytics: EatsAnalytics }) {
  return (
    <div className="analytics-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Patterns</span>
            <h2>Your ordering rhythm</h2>
          </div>
        </div>
        <dl className="data-list">
          <DataRow
            label="Busiest month"
            value={analytics.busiestMonth ? `${analytics.busiestMonth.label} · ${formatCount(analytics.busiestMonth.count, "order")}` : "—"}
          />
          <DataRow label="Most common day" value={analytics.busiestWeekday ? `${analytics.busiestWeekday.label}s` : "—"} />
          <DataRow
            label="Average cadence"
            value={analytics.averageDaysBetweenOrders === null ? "—" : `Every ${formatDecimal(analytics.averageDaysBetweenOrders)} days`}
          />
          <DataRow
            label="Monthly pace"
            value={analytics.averageOrdersPerMonth === null ? "—" : formatDecimalCount(analytics.averageOrdersPerMonth, "order")}
          />
          <DataRow label="Completion rate" value={analytics.completionRate === null ? "—" : formatPercent(analytics.completionRate)} />
        </dl>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Favorites</span>
            <h2>Top restaurants</h2>
          </div>
        </div>
        <CountList values={analytics.restaurantCounts} empty="No completed restaurant data was included." />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Menu</span>
            <h2>Most ordered items</h2>
          </div>
        </div>
        <CountList values={analytics.itemCounts} empty="No completed item data was included." />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Spending</span>
            <h2>Currency breakdown</h2>
          </div>
          {analytics.averageOrderUsd !== null && <span className="panel-note">~{formatUsd(analytics.averageOrderUsd)} average</span>}
        </div>
        {analytics.currencyTotals.length === 0 ? (
          <p className="panel-empty">
            {analytics.unlabelledPriceCount > 0
              ? `${formatCount(analytics.unlabelledPriceCount, "order total")} did not include a currency label.`
              : "No priced completed orders were included."}
          </p>
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
        <div className="status-summary">
          {analytics.statusCounts.slice(0, 4).map((status) => (
            <span key={status.label}>
              <strong>{formatInteger(status.count)}</strong> {status.label.toLocaleLowerCase()}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
