import { describe, expect, it } from "vitest";
import { readFirebaseClientConfig } from "./firebaseConfig";

describe("readFirebaseClientConfig", () => {
  it("reads Firebase config from Vite env values", () => {
    const config = readFirebaseClientConfig({
      VITE_FIREBASE_API_KEY: "api-key",
      VITE_FIREBASE_AUTH_DOMAIN: "example.firebaseapp.com",
      VITE_FIREBASE_DATABASE_URL: "https://example.firebaseio.com",
      VITE_FIREBASE_PROJECT_ID: "example",
      VITE_FIREBASE_APP_ID: "app-id",
    });

    expect(config).toEqual({
      apiKey: "api-key",
      authDomain: "example.firebaseapp.com",
      databaseURL: "https://example.firebaseio.com",
      projectId: "example",
      appId: "app-id",
    });
  });

  it("throws a clear error when required env values are missing", () => {
    expect(() =>
      readFirebaseClientConfig({
        VITE_FIREBASE_API_KEY: "api-key",
      }),
    ).toThrow(
      "Firebase設定が不足しています: VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_DATABASE_URL, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID",
    );
  });
});
