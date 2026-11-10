import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import { createRemoteJWKSet, jwtVerify } from "jose";

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

// ---------- verify JWT (token comes from BetterAuth) ----------
// BetterAuth shares its public keys at /api/auth/jwks
const JWKS = createRemoteJWKSet(new URL(`${clientUrl}/api/auth/jwks`));

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: clientUrl,
      audience: clientUrl,
    });
    req.user = payload; // payload has email, name, image
    next();
  } catch (error) {
    return res.status(401).send({ message: "unauthorized access" });
  }
};

// ---------- check event form data ----------
const checkEvent = (event, checkDate = true) => {
  if (!event.title || event.title.length < 5) return "Title must be at least 5 characters";
  if (!event.description || event.description.length < 20) return "Description must be at least 20 characters";
  if (!eventTypes.includes(event.eventType)) return "Please choose a valid event type";
  if (!event.thumbnail || !event.thumbnail.startsWith("http")) return "Thumbnail must be a valid image URL";
  if (!event.location || event.location.length < 3) return "Location is required";
  if (checkDate && (!event.eventDate || new Date(event.eventDate) <= new Date())) return "Event date must be in the future";
  return null;
};

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

// events created by the logged in user
app.get("/events/mine", verifyToken, async (req, res) => {
  const query = { creatorEmail: req.user.email };
  const result = await eventsCollection.find(query).sort({ eventDate: 1 }).toArray();
  res.send(result);
});

// create event
app.post("/events", verifyToken, async (req, res) => {
  const event = req.body;

  const error = checkEvent(event);
  if (error) {
    return res.status(400).send({ message: error });
  }

  const newEvent = {
    title: event.title,
    description: event.description,
    eventType: event.eventType,
    thumbnail: event.thumbnail,
    location: event.location,
    eventDate: new Date(event.eventDate),
    creatorEmail: req.user.email,
    creatorName: req.user.name,
    creatorImage: req.user.image,
    participantsCount: 0,
    createdAt: new Date(),
  };

  const result = await eventsCollection.insertOne(newEvent);
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
