import { initializeApp, getApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, httpsCallable, type Functions, type HttpsCallable } from 'firebase/functions';
import { getCaspianShareCollections, type CaspianShareCollections } from './collections';
import type { RecordShareEventsRequest, RecordShareEventsResponse } from './types';

export interface CaspianShareFirebase {
  app: FirebaseApp;
  db: Firestore;
  functions: Functions;
  collections: CaspianShareCollections;
  callables: {
    recordShareEvents: HttpsCallable<RecordShareEventsRequest, RecordShareEventsResponse>;
  };
}

export interface InitCaspianShareFirebaseOptions {
  config: FirebaseOptions;
  /** Optional named app, useful when an app already mounts another Firebase. */
  appName?: string;
  /** Cloud Functions region. Default: `us-central1`. */
  functionsRegion?: string;
}

/**
 * Initialize (or retrieve) the Firebase app + Firestore + Functions clients
 * used by Caspian Share. Idempotent — safe to call multiple times with the
 * same `appName`.
 *
 * Callable from both browser and server (Server Components, Route Handlers,
 * test scripts) — this module has no `'use client'` directive.
 */
export function initCaspianShareFirebase({
  config,
  appName = '[DEFAULT]',
  functionsRegion = 'us-central1',
}: InitCaspianShareFirebaseOptions): CaspianShareFirebase {
  const existing = getApps().find((a) => a.name === appName);
  const app = existing ?? (appName === '[DEFAULT]' ? initializeApp(config) : initializeApp(config, appName));
  const db = getFirestore(app);
  const functions = getFunctions(app, functionsRegion);
  const collections = getCaspianShareCollections(db);
  return {
    app,
    db,
    functions,
    collections,
    callables: {
      recordShareEvents: httpsCallable<RecordShareEventsRequest, RecordShareEventsResponse>(
        functions,
        'caspianShareRecordEvents',
      ),
    },
  };
}

/** Returns the named Firebase app if already initialized; else throws. */
export function getCaspianShareApp(appName = '[DEFAULT]'): FirebaseApp {
  const app = getApps().find((a) => a.name === appName);
  if (!app) {
    throw new Error(
      `Caspian Share Firebase app "${appName}" is not initialized. Wrap your tree in <CaspianShareProvider firebaseConfig={...}> or call initCaspianShareFirebase() directly.`,
    );
  }
  return app ?? getApp(appName);
}
