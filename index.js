import "dotenv/config";
import express from "express";
import cors from "cors";
import { getDb } from "./config/db.js";

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""));

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send({ message: "KindHands server is running" });
});

app.get("/health", async (req, res) => {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    res.send({ ok: true, database: "connected" });
  } catch (error) {
    res.status(500).send({ ok: false, message: error.message });
  }
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`KindHands server listening on port ${port}`);
  });
}

export default app;
