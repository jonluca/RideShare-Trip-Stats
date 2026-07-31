# Privacy Policy for RideShare Trip Stats

Last updated: July 31, 2026

RideShare Trip Stats is a browser extension that analyzes the signed-in user's Uber ride history and displays trip, spending, distance, and time statistics.

## Data the extension handles

When the user invokes the extension on `https://riders.uber.com`, it requests the user's ride history from Uber using the user's existing signed-in Uber session. The returned data can include:

- Trip dates and times, pickup and drop-off information, route or waypoint information, distance, and duration.
- Fare and payment-profile identifiers associated with a trip.
- Driver, vehicle, rating, organization, trip-status, and technical trip identifiers.

The extension relies on the user's existing Uber session and a transient CSRF token to make these user-requested calls. It does not ask for, read, or store the user's Uber password, and it does not use the Chrome cookies permission.

## How data is used

RideShare Trip Stats uses ride-history data only to calculate and display statistics requested by the user and to let the user export those results. The extension does not use the data for advertising, profiling, credit decisions, or any unrelated purpose.

## Storage and retention

The most recently retrieved ride-history data is stored locally on the user's device with the browser's extension storage API so the results page can display it. It remains there until it is replaced by a later analysis, the user clears the extension's data, or the extension is uninstalled.

An exported file is saved only when the user chooses to export it and is then controlled by the user.

## Data sharing and transfers

The extension communicates directly with Uber over HTTPS to retrieve the ride history that the user requested. RideShare Trip Stats does not send ride-history data, authentication data, analytics, or telemetry to the developer or to developer-controlled servers. It does not sell or share user data with advertisers, data brokers, or other third parties.

## Browser permissions

The extension requests only these permissions:

- `activeTab`: temporarily access the active Uber Riders tab after the user clicks the extension.
- `scripting`: run the ride-history analysis script in that user-invoked Uber Riders tab.
- `storage`: keep the retrieved data locally so the extension's results page can display and export it.

The extension does not request persistent host access and does not load or execute remote code.

## Limited Use

The use of information received from Chrome APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements. User data is used only to provide the extension's single user-facing purpose.

## Changes to this policy

If the extension's data practices change, this policy will be updated before those changes are released.

## Contact

Questions about this policy can be sent to [chrome@jonlu.ca](mailto:chrome@jonlu.ca).
