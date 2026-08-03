import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { importUberDataBytes, parseCsv } from "./importUberData";

const tripCsv = `Trip ID,Trip or Order Status,Request Time,Begin Trip Time,Begin Trip Address,Dropoff Time,Dropoff Address,Distance (miles),Fare Amount,Fare Currency,Product Type
legacy-trip-2014,completed,2014-06-02T10:00:00Z,2014-06-02T10:05:00Z,"1 Main St, New York",2014-06-02T10:25:00Z,"2 Broadway, New York",4.5,18.25,USD,UberX
`;

describe("Uber data import", () => {
  it("parses quoted CSV fields", () => {
    const rows = parseCsv('one,"two, three","escaped ""quote"""\n');
    expect(rows).toEqual([["one", "two, three", 'escaped "quote"']]);
  });

  it("maps the rider trips CSV into analytics records", () => {
    const result = importUberDataBytes("Trips Data.csv", strToU8(tripCsv));

    expect(result).toMatchObject({ parsedRows: 1, skippedRows: 0, sourceFiles: 1 });
    expect(result.records[0]).toMatchObject({
      receipt: { distance: "4.5", distanceLabel: "miles", vehicleType: "UberX" },
      trip: {
        beginTripTime: "2014-06-02T10:05:00Z",
        fare: "USD 18.25",
        status: "completed",
        uuid: "legacy-trip-2014",
        waypoints: ["1 Main St, New York", "2 Broadway, New York"],
      },
    });
  });

  it("finds the rider trips CSV inside an Uber data ZIP", () => {
    const archive = zipSync({
      "Account/Profile.csv": strToU8("Name\nExample\n"),
      "Driver/Driver Lifetime Trips.csv": strToU8(tripCsv.replace("legacy-trip-2014", "driver-trip-2014")),
      "Rider/Rider App Analytics.csv": strToU8("Start Time,Location\n2014-01-01T00:00:00Z,Example\n"),
      "Rider/Trips Data.csv": strToU8(tripCsv),
    });

    const result = importUberDataBytes("uber-data.zip", archive);
    expect(result.records).toHaveLength(1);
    expect(result.sourceFiles).toBe(1);
  });

  it("rejects files that do not contain rider trip history", () => {
    expect(() => importUberDataBytes("profile.csv", strToU8("Name,Email\nExample,user@example.com\n"))).toThrow(
      "No Uber rider trips CSV was found",
    );
  });
});
