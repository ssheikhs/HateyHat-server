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

const eventTypes = ["Cleanup", "Plantation", "Donation", "Food Drive", "Blood Donation", "Education", "Healthcare", "Relief"];

app.get("/", (req, res) => {
  res.send("HateyHat server is running");
});

// ================= EVENTS =================

// all event types
app.get("/events/types", (req, res) => {
  res.send(eventTypes);
});

// home page: 6 nearest upcoming events
app.get("/events/featured", async (req, res) => {
  const query = { eventDate: { $gte: new Date() } };
  const result = await eventsCollection.find(query).sort({ eventDate: 1 }).limit(6).toArray();
  res.send(result);
});

// upcoming events with search and filter
app.get("/events", async (req, res) => {
  const { search, type } = req.query;
  const query = { eventDate: { $gte: new Date() } };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
    ];
  }
  if (type) {
    query.eventType = type;
  }

  const result = await eventsCollection.find(query).sort({ eventDate: 1 }).toArray();
  res.send(result);
});

// single event details
app.get("/events/:id", async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid event id" });
  }

  const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
  if (!event) {
    return res.status(404).send({ message: "Event not found" });
  }
  res.send(event);
});

app.listen(port, () => {
  console.log(`HateyHat server is running on port ${port}`);
});
