import { describe, expect, it } from "vitest";
import { getFirebaseRoomPath } from "./firebaseRoomDocument";

describe("getFirebaseRoomPath", () => {
  it("returns the Realtime Database path for a room", () => {
    expect(getFirebaseRoomPath("ABCD12")).toBe("rooms/ABCD12");
  });
});
