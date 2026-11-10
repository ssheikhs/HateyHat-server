import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

// middleware
app.use(cors({ origin: clientUrl }));
app.use(express.json());

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const db = client.db(process.env.DB_NAME || "hateyhat");
const eventsCollection = db.collection("events");
const joinsCollection = db.collection("joins");

app.get("/", (req, res) => {
  res.send("HateyHat server is running");
});

app.listen(port, () => {
  console.log(`HateyHat server is running on port ${port}`);
});
