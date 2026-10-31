import { Router } from "express";
import { ObjectId } from "mongodb";
import { collections } from "../config/db.js";
import { EVENT_TYPES } from "../utils/validateEvent.js";

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

export default router;
