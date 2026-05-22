import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

type FirebaseEnv = {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_DATABASE_URL?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
};

export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  appId: string;
};

export type FirebaseClient = {
  app: FirebaseApp;
  database: Database;
};

const REQUIRED_ENV_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_DATABASE_URL",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

export function readFirebaseClientConfig(
  env: FirebaseEnv = import.meta.env,
): FirebaseClientConfig {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => isBlank(env[key]));

  if (missingKeys.length > 0) {
    throw new Error(`Firebase設定が不足しています: ${missingKeys.join(", ")}`);
  }

  return {
    apiKey: requireEnvValue(env, "VITE_FIREBASE_API_KEY"),
    authDomain: requireEnvValue(env, "VITE_FIREBASE_AUTH_DOMAIN"),
    databaseURL: requireEnvValue(env, "VITE_FIREBASE_DATABASE_URL"),
    projectId: requireEnvValue(env, "VITE_FIREBASE_PROJECT_ID"),
    appId: requireEnvValue(env, "VITE_FIREBASE_APP_ID"),
  };
}

export function createFirebaseClient(
  config: FirebaseClientConfig = readFirebaseClientConfig(),
): FirebaseClient {
  const app = getApps()[0] ?? initializeApp(config);

  return {
    app,
    database: getDatabase(app),
  };
}

function isBlank(value: string | undefined): value is undefined {
  return value === undefined || value.trim() === "";
}

function requireEnvValue(
  env: FirebaseEnv,
  key: (typeof REQUIRED_ENV_KEYS)[number],
): string {
  const value = env[key];

  if (isBlank(value)) {
    throw new Error(`Firebase設定が不足しています: ${key}`);
  }

  return value;
}
