import type { EatsYearActivity } from "../analytics/eatsAnalytics";
import { formatInteger, formatUsd } from "./formatters";

export function EatsYearlyActivity({ activity }: { activity: EatsYearActivity[] }) {
  const maximum = Math.max(...activity.map((entry) => entry.orders), 1);
  return (
    <section className="panel activity-panel">
      <div className="panel-heading">
        <div>
          <span className="panel-kicker">History</span>
          <h2>Orders by year</h2>
        </div>
        <span className="panel-note">Lifetime activity</span>
      </div>
      <div className="activity-chart">
        {activity.map((entry) => (
          <div className="activity-row" key={entry.year}>
            <span className="activity-year">{entry.year}</span>
            <div className="activity-track">
              <span className="activity-bar" style={{ width: `${Math.max(2, (entry.orders / maximum) * 100)}%` }} />
            </div>
            <strong>{formatInteger(entry.orders)}</strong>
            <span className="activity-spend">{entry.usdSpent === 0 ? "" : `~${formatUsd(entry.usdSpent)}`}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
