import "dotenv/config";
import express from "express";
import cors from "cors";

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

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`KindHands server listening on port ${port}`);
  });
}

export default app;
