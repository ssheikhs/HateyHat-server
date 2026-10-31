import { Router } from "express";
import { ObjectId } from "mongodb";
import { collections } from "../config/db.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = Router();

// Join an event
router.post("/events/:id/join", verifyToken, async (req, res, next) => {
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
    if (new Date(event.eventDate).getTime() < Date.now()) {
      return res.status(400).send({ message: "This event has already taken place" });
    }
    if (event.creatorEmail === req.user.email) {
      return res.status(400).send({ message: "You are the organizer of this event" });
    }

    const already = await joins.findOne({ eventId: _id, userEmail: req.user.email });
    if (already) {
      return res.status(409).send({ message: "You have already joined this event" });
    }

    const joinDoc = {
      eventId: _id,
      userEmail: req.user.email,
      userName: req.user.name || "",
      userImage: req.user.image || "",
      event: {
        title: event.title,
        thumbnail: event.thumbnail,
        location: event.location,
        eventType: event.eventType,
        eventDate: event.eventDate,
        creatorEmail: event.creatorEmail,
        creatorName: event.creatorName,
      },
      joinedAt: new Date(),
    };

    try {
      const result = await joins.insertOne(joinDoc);
      await events.updateOne({ _id }, { $inc: { participantsCount: 1 } });
      res.status(201).send({ ...joinDoc, _id: result.insertedId });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).send({ message: "You have already joined this event" });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

// Has the logged-in user joined this event?
router.get("/events/:id/join-status", verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid event id" });
    }
    const { joins } = await collections();
    const join = await joins.findOne({
      eventId: new ObjectId(id),
      userEmail: req.user.email,
    });
    res.send({ joined: Boolean(join), joinedAt: join?.joinedAt || null });
  } catch (error) {
    next(error);
  }
});

// All events joined by the logged-in user, sorted by event date
router.get("/joined-events", verifyToken, async (req, res, next) => {
  try {
    const { joins } = await collections();
    const result = await joins
      .find({ userEmail: req.user.email })
      .sort({ "event.eventDate": 1 })
      .toArray();
    res.send(result);
  } catch (error) {
    next(error);
  }
});

export default router;
