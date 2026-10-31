import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is not set. Add it to your .env file.");
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

// Reuse one connection across serverless invocations on Vercel
let dbPromise = globalThis.__hateyhatDb;

export async function getDb() {
  if (!dbPromise) {
    dbPromise = client.connect().then(async (c) => {
      const db = c.db(process.env.DB_NAME || "hateyhat");
      await Promise.all([
        db.collection("events").createIndex({ eventDate: 1 }),
        db.collection("events").createIndex({ creatorEmail: 1 }),
        db
          .collection("joins")
          .createIndex({ eventId: 1, userEmail: 1 }, { unique: true }),
      ]);
      return db;
    });
    globalThis.__hateyhatDb = dbPromise;
    dbPromise.catch(() => {
      dbPromise = null;
      globalThis.__hateyhatDb = null;
    });
  }
  return dbPromise;
}

export async function collections() {
  const db = await getDb();
  return {
    events: db.collection("events"),
    joins: db.collection("joins"),
  };
}
