import { describe, expect, it } from "vitest";
import { ACTIVITIES_QUERY, createActivitiesRequest, createGetTripRequest } from "./uberRequests";

describe("Uber GraphQL requests", () => {
  it("does not declare the unused upcoming-trip variable rejected by Uber", () => {
    const request = createActivitiesRequest();

    expect(ACTIVITIES_QUERY).not.toContain("includeUpcoming");
    expect(request.variables).not.toHaveProperty("includeUpcoming");
  });

  it("passes the activity pagination token through", () => {
    expect(createActivitiesRequest("next-page").variables.nextPageToken).toBe("next-page");
  });

  it("creates a trip-detail request for the selected trip", () => {
    expect(createGetTripRequest("trip-id")).toMatchObject({
      operationName: "GetTrip",
      variables: { tripUUID: "trip-id" },
    });
  });
});
