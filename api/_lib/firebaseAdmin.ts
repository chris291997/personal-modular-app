import admin from 'firebase-admin';

type FirebaseServices = {
  db: admin.firestore.Firestore;
  auth: admin.auth.Auth;
  messaging: admin.messaging.Messaging;
};

let services: FirebaseServices | null = null;

const parseServiceAccount = (): admin.ServiceAccount => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
  }

  let parsed: admin.ServiceAccount;
  try {
    parsed = JSON.parse(raw) as admin.ServiceAccount;
  } catch (error) {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT is invalid JSON: ${error instanceof Error ? error.message : 'unknown error'}`);
  }

  if (!parsed.projectId && !(parsed as Record<string, unknown>).project_id) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT JSON is missing project_id/projectId.');
  }
  if (!parsed.clientEmail && !(parsed as Record<string, unknown>).client_email) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT JSON is missing client_email/clientEmail.');
  }
  if (!parsed.privateKey && !(parsed as Record<string, unknown>).private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT JSON is missing private_key/privateKey.');
  }

  return parsed;
};

export const getFirebaseAdminServices = (): FirebaseServices => {
  if (services) return services;

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(parseServiceAccount()),
    });
  }

  services = {
    db: admin.firestore(),
    auth: admin.auth(),
    messaging: admin.messaging(),
  };
  return services;
};

export const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
};

export const assertCronSecret = (authorizationHeader?: string): void => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw new Error('CRON_SECRET is not configured.');
  }
  const expected = `Bearer ${secret}`;
  if (authorizationHeader !== expected) {
    throw new Error('Unauthorized cron invocation.');
  }
};
