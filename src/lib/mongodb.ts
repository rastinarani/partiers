import { MongoClient, type Db } from "mongodb";

const dbName = process.env.MONGODB_DB || "partiers";

// Shared across requests (and across hot reloads in dev) so we reuse one
// connection pool instead of opening a new one per request.
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (!globalThis._mongoClientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error(
        "Missing MONGODB_URI environment variable. Add it to .env.local (see .env.example)."
      );
    }

    const promise = new MongoClient(uri).connect();
    // Never keep a failed connection around: otherwise one bad attempt
    // (e.g. the database was briefly unreachable) makes every later request
    // fail until the server restarts. The next request retries instead.
    promise.catch((err) => {
      console.error("MongoDB connection failed:", err);
      if (globalThis._mongoClientPromise === promise) {
        globalThis._mongoClientPromise = undefined;
      }
    });
    globalThis._mongoClientPromise = promise;
  }
  return globalThis._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(dbName);
}
