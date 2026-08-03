# Privacy Policy for RideShare Trip Stats

Last updated: August 3, 2026

RideShare Trip Stats is a browser extension that analyzes the signed-in user's Uber ride and Uber Eats order history, plus user-selected Uber export data. It displays ride and order statistics locally.

## Data the extension handles

When the user invokes the extension on `https://riders.uber.com`, it requests the user's ride history from Uber using the user's existing signed-in Uber session. The returned data can include:

- Trip dates and times, pickup and drop-off information, route or waypoint information, distance, and duration.
- Fare and payment-profile identifiers associated with a trip.
- Driver, vehicle, rating, organization, trip-status, and technical trip identifiers.

The extension relies on the user's existing Uber session and a transient CSRF token to make these user-requested calls. It does not ask for, read, or store the user's Uber password, and it does not use the Chrome cookies permission.

When the user invokes the extension on `https://www.ubereats.com/orders`, it requests past orders from Uber Eats using the user's existing signed-in session and the same paginated history interface used by the Past Orders page. Returned data can include order identifiers, dates, statuses, restaurant identifiers and names, restaurant locations, item names, quantities, prices, customizations, and special instructions.

The user may optionally select an official Uber data-download ZIP or Rider/Eater CSV files. Rider Trips Data can add history that Uber no longer returns through its live activity feed. Eater files can include order identifiers, dates, statuses, restaurant identifiers and names, cities, item names, quantities, prices, customizations, and special instructions. Selected files are read locally in the results page and are not uploaded by the extension.

## How data is used

RideShare Trip Stats uses ride and Eats order-history data only to calculate and display statistics requested by the user and to let the user export those results. The extension does not use the data for advertising, profiling, credit decisions, or any unrelated purpose.

## Storage and retention

Retrieved and user-imported ride-history data is merged and stored separately from retrieved and imported Eats orders in the browser's extension storage. Historical records are preserved across later analyses and imports. The data remains until the user clears the extension's data or uninstalls the extension.

An exported file is saved only when the user chooses to export it and is then controlled by the user.

## Data sharing and transfers

The extension communicates directly with Uber and Uber Eats over HTTPS only to retrieve the ride or order history that the user requested. Additional archive history is read from files the user explicitly selects. RideShare Trip Stats does not send ride history, Eats order data, authentication data, analytics, or telemetry to the developer or to developer-controlled servers. It does not sell or share user data with advertisers, data brokers, or other third parties.

## Browser permissions

The extension requests only these permissions:

- `activeTab`: temporarily access the active Uber Riders or Uber Eats tab after the user clicks the extension.
- `storage`: keep retrieved and imported rides and Eats orders locally so the results page can display and export them.

The extension declares content scripts limited to `https://riders.uber.com/*` and `https://www.ubereats.com/*`. It shows the launcher only on the Trips or Past Orders route and waits for the user to start analysis. The extension does not load or execute remote code.

## Limited Use

The use of information received from Chrome APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements. User data is used only to provide the extension's single user-facing purpose.

## Changes to this policy

If the extension's data practices change, this policy will be updated before those changes are released.

## Contact

Questions about this policy can be sent to [chrome@jonlu.ca](mailto:chrome@jonlu.ca).
