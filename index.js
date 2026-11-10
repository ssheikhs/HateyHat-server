import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

// middleware
app.use(cors({ origin: clientUrl }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("HateyHat server is running");
});

app.listen(port, () => {
  console.log(`HateyHat server is running on port ${port}`);
});
