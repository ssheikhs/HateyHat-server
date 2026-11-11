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
const imagesCollection = db.collection("images");

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

// update event (only the creator)
app.patch("/events/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };

  const event = await eventsCollection.findOne(filter);
  if (!event) {
    return res.status(404).send({ message: "Event not found" });
  }
  if (event.creatorEmail !== req.user.email) {
    return res.status(403).send({ message: "forbidden access" });
  }

  const updated = req.body;
  // the date is only sent when the user changed it
  const dateChanged = !!updated.eventDate;
  if (!dateChanged) {
    updated.eventDate = event.eventDate;
  }
  const error = checkEvent(updated, dateChanged);
  if (error) {
    return res.status(400).send({ message: error });
  }

  const updateDoc = {
    $set: {
      title: updated.title,
      description: updated.description,
      eventType: updated.eventType,
      thumbnail: updated.thumbnail,
      location: updated.location,
      eventDate: new Date(updated.eventDate),
    },
  };
  const result = await eventsCollection.updateOne(filter, updateDoc);

  // also update the event info saved inside joins
  await joinsCollection.updateMany(
    { eventId: new ObjectId(id) },
    {
      $set: {
        "event.title": updated.title,
        "event.thumbnail": updated.thumbnail,
        "event.location": updated.location,
        "event.eventType": updated.eventType,
        "event.eventDate": new Date(updated.eventDate),
      },
    }
  );

  res.send(result);
});

// delete event (only the creator)
app.delete("/events/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };

  const event = await eventsCollection.findOne(filter);
  if (!event) {
    return res.status(404).send({ message: "Event not found" });
  }
  if (event.creatorEmail !== req.user.email) {
    return res.status(403).send({ message: "forbidden access" });
  }

  const result = await eventsCollection.deleteOne(filter);
  await joinsCollection.deleteMany({ eventId: new ObjectId(id) });
  res.send(result);
});

// ================= JOIN EVENTS =================

// join an event
app.post("/events/:id/join", verifyToken, async (req, res) => {
  const id = req.params.id;
  const email = req.user.email;

  const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
  if (!event) {
    return res.status(404).send({ message: "Event not found" });
  }
  if (new Date(event.eventDate) < new Date()) {
    return res.status(400).send({ message: "This event is already over" });
  }
  if (event.creatorEmail === email) {
    return res.status(400).send({ message: "You are the organizer of this event" });
  }

  // a user can join one event only once
  const alreadyJoined = await joinsCollection.findOne({ eventId: new ObjectId(id), userEmail: email });
  if (alreadyJoined) {
    return res.status(409).send({ message: "You have already joined this event" });
  }

  const join = {
    eventId: new ObjectId(id),
    userEmail: email,
    userName: req.user.name,
    userImage: req.user.image,
    event: {
      title: event.title,
      thumbnail: event.thumbnail,
      location: event.location,
      eventType: event.eventType,
      eventDate: event.eventDate,
    },
    joinedAt: new Date(),
  };

  const result = await joinsCollection.insertOne(join);
  await eventsCollection.updateOne({ _id: new ObjectId(id) }, { $inc: { participantsCount: 1 } });
  res.send(result);
});

// leave an event
app.delete("/events/:id/join", verifyToken, async (req, res) => {
  const id = req.params.id;
  const result = await joinsCollection.deleteOne({ eventId: new ObjectId(id), userEmail: req.user.email });

  if (result.deletedCount > 0) {
    await eventsCollection.updateOne({ _id: new ObjectId(id) }, { $inc: { participantsCount: -1 } });
  }
  res.send(result);
});

// did the user join this event?
app.get("/events/:id/join-status", verifyToken, async (req, res) => {
  const join = await joinsCollection.findOne({ eventId: new ObjectId(req.params.id), userEmail: req.user.email });
  res.send({ joined: !!join });
});

// people who joined an event (only the creator can see)
app.get("/events/:id/participants", verifyToken, async (req, res) => {
  const id = req.params.id;
  const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
  if (!event || event.creatorEmail !== req.user.email) {
    return res.status(403).send({ message: "forbidden access" });
  }

  const result = await joinsCollection.find({ eventId: new ObjectId(id) }).toArray();
  res.send(result);
});

// all events the user joined, sorted by event date
app.get("/joined-events", verifyToken, async (req, res) => {
  const query = { userEmail: req.user.email };
  const result = await joinsCollection.find(query).sort({ "event.eventDate": 1 }).toArray();
  res.send(result);
});

// ================= STATS (home page) =================
app.get("/stats", async (req, res) => {
  const totalEvents = await eventsCollection.countDocuments();
  const upcomingEvents = await eventsCollection.countDocuments({ eventDate: { $gte: new Date() } });
  const totalVolunteers = await joinsCollection.countDocuments();
  // group events by creator email to count organizers
  const organizers = await eventsCollection.aggregate([{ $group: { _id: "$creatorEmail" } }]).toArray();

  res.send({ totalEvents, upcomingEvents, totalVolunteers, organizers: organizers.length });
});

// ================= IMAGE UPLOAD =================

// save an image file sent from the browser
app.post("/images", express.raw({ type: "*/*", limit: "3mb" }), async (req, res) => {
  const image = {
    data: req.body,
    contentType: req.headers["content-type"],
    createdAt: new Date(),
  };
  const result = await imagesCollection.insertOne(image);
  res.send({ id: result.insertedId });
});

// show an image
app.get("/images/:id", async (req, res) => {
  const image = await imagesCollection.findOne({ _id: new ObjectId(req.params.id) });
  if (!image) {
    return res.status(404).send({ message: "Image not found" });
  }
  res.set("Content-Type", image.contentType);
  res.send(Buffer.from(image.data.buffer));
});

app.listen(port, () => {
  console.log(`HateyHat server is running on port ${port}`);
});
