# RideShareStats

[Live version on Chrome Web Store](https://chrome.google.com/webstore/detail/uber-trip-stats/kddlnbejbpknoedebeojobofnbdfhpnm)

![logo](images/icon500.png)

View your rideshare profile statistics!

To use this extension, go to https://rides.uber.com/trips and sign in. Then click the extension logo from the top bar in Chrome!

![image](https://i.imgur.com/TBOTsi4.png)

## Note

Currency conversion for total spent and averages are currently done using a locally cached conversion chart. It uses exchange rates as of 2/3/2018. These will slowly become incorrect, and may need updating.

They were taken from https://www.xe.com/currencytables/?from=USD. Copy the column and use the following regex replace to update.

The regex for matching is `(.*)?	(.*)?	(.*)	(.*)`. Replace with `"$1":"$4",` and place in `rates` key within `currency.json`.