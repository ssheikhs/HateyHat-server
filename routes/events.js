import { Router } from "express";
import { ObjectId } from "mongodb";
import { collections } from "../config/db.js";
import { EVENT_TYPES, validateEvent } from "../utils/validateEvent.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = Router();

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Event types for dropdowns and filters
router.get("/types", (req, res) => {
  res.send(EVENT_TYPES);
});

// Home page: 6 nearest upcoming events
router.get("/featured", async (req, res, next) => {
  try {
    const { events } = await collections();
    const result = await events
      .find({ eventDate: { $gte: new Date() } })
      .sort({ eventDate: 1 })
      .limit(6)
      .toArray();
    res.send(result);
  } catch (error) {
    next(error);
  }
});

// Upcoming events page: only future events, with optional search & type filter
router.get("/", async (req, res, next) => {
  try {
    const { events } = await collections();
    const { search = "", type = "" } = req.query;
    const query = { eventDate: { $gte: new Date() } };

    if (search.trim()) {
      const pattern = new RegExp(escapeRegex(search.trim()), "i");
      query.$or = [{ title: pattern }, { location: pattern }];
    }
    if (type && EVENT_TYPES.includes(type)) {
      query.eventType = type;
    }

    const result = await events.find(query).sort({ eventDate: 1 }).toArray();
    res.send(result);
  } catch (error) {
    next(error);
  }
});

// Events created by the logged-in user (Manage Events page)
router.get("/mine", verifyToken, async (req, res, next) => {
  try {
    const { events } = await collections();
    const result = await events
      .find({ creatorEmail: req.user.email })
      .sort({ eventDate: 1 })
      .toArray();
    res.send(result);
  } catch (error) {
    next(error);
  }
});

// Create a new event (logged-in users only)
router.post("/", verifyToken, async (req, res, next) => {
  try {
    const { errors, data, isValid } = validateEvent(req.body);
    if (!isValid) {
      return res.status(400).send({ message: "Validation failed", errors });
    }

    const { events } = await collections();
    const now = new Date();
    const doc = {
      ...data,
      creatorEmail: req.user.email,
      creatorName: req.user.name || "",
      creatorImage: req.user.image || "",
      participantsCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const result = await events.insertOne(doc);
    res.status(201).send({ ...doc, _id: result.insertedId });
  } catch (error) {
    next(error);
  }
});

// Public event details
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid event id" });
    }
    const { events } = await collections();
    const event = await events.findOne({ _id: new ObjectId(id) });
    if (!event) {
      return res.status(404).send({ message: "Event not found" });
    }
    res.send(event);
  } catch (error) {
    next(error);
  }
});

// Update an event - only the creator may do this
router.patch("/:id", verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid event id" });
    }

    const { errors, data, isValid } = validateEvent(req.body, { partial: true });
    if (!isValid) {
      return res.status(400).send({ message: "Validation failed", errors });
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).send({ message: "Nothing to update" });
    }

    const { events, joins } = await collections();
    const _id = new ObjectId(id);
    const event = await events.findOne({ _id });
    if (!event) {
      return res.status(404).send({ message: "Event not found" });
    }
    if (event.creatorEmail !== req.user.email) {
      return res.status(403).send({ message: "You can only update your own events" });
    }

    data.updatedAt = new Date();
    await events.updateOne({ _id }, { $set: data });

    // Keep the event snapshot inside join records in sync
    const snapshot = {};
    for (const key of ["title", "thumbnail", "location", "eventType", "eventDate"]) {
      if (data[key] !== undefined) snapshot[`event.${key}`] = data[key];
    }
    if (Object.keys(snapshot).length) {
      await joins.updateMany({ eventId: _id }, { $set: snapshot });
    }

    const updated = await events.findOne({ _id });
    res.send(updated);
  } catch (error) {
    next(error);
  }
});

// Delete an event - only the creator may do this
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid event id" });
    }
    const { events, joins } = await collections();
    const _id = new ObjectId(id);
    const event = await events.findOne({ _id });
    if (!event) {
      return res.status(404).send({ message: "Event not found" });
    }
    if (event.creatorEmail !== req.user.email) {
      return res.status(403).send({ message: "You can only delete your own events" });
    }

    await events.deleteOne({ _id });
    const removedJoins = await joins.deleteMany({ eventId: _id });
    res.send({ deleted: true, removedJoins: removedJoins.deletedCount });
  } catch (error) {
    next(error);
  }
});

export default router;
