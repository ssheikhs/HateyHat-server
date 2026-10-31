import { Router } from "express";
import { collections } from "../config/db.js";

const router = Router();

// Public community impact numbers for the home page
router.get("/", async (req, res, next) => {
  try {
    const { events, joins } = await collections();
    const now = new Date();
    const [totalEvents, upcomingEvents, totalJoins, organizers] = await Promise.all([
      events.countDocuments(),
      events.countDocuments({ eventDate: { $gte: now } }),
      joins.countDocuments(),
      events.distinct("creatorEmail"),
    ]);
    res.send({
      totalEvents,
      upcomingEvents,
      totalVolunteers: totalJoins,
      organizers: organizers.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
