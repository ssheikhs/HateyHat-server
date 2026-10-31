import express, { Router } from "express";
import { Binary, ObjectId } from "mongodb";
import { collections } from "../config/db.js";

const router = Router();
const MAX_BYTES = 3 * 1024 * 1024;

// Recognise real image files by their first bytes, not just the header the browser sends
function detectType(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return "image/webp";
  if (buf.slice(0, 3).toString() === "GIF") return "image/gif";
  return null;
}

// Upload an image straight from the user's computer (sent as the raw file body)
router.post(
  "/",
  express.raw({ type: ["image/*", "application/octet-stream"], limit: MAX_BYTES }),
  async (req, res, next) => {
    try {
      const buf = req.body;
      if (!Buffer.isBuffer(buf) || buf.length === 0) {
        return res.status(400).send({ message: "Choose an image file to upload" });
      }
      const contentType = detectType(buf);
      if (!contentType) {
        return res.status(400).send({ message: "Only JPG, PNG, WebP or GIF images can be uploaded" });
      }
      const { images } = await collections();
      const result = await images.insertOne({
        data: new Binary(buf),
        contentType,
        size: buf.length,
        createdAt: new Date(),
      });
      res.status(201).send({ id: result.insertedId, path: `/images/${result.insertedId}` });
    } catch (error) {
      next(error);
    }
  }
);

// Serve an uploaded image
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(404).send({ message: "Image not found" });
    }
    const { images } = await collections();
    const image = await images.findOne({ _id: new ObjectId(id) });
    if (!image) {
      return res.status(404).send({ message: "Image not found" });
    }
    res.set("Content-Type", image.contentType);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.send(Buffer.from(image.data.buffer));
  } catch (error) {
    next(error);
  }
});

// Upload errors (file too large) as friendly JSON
// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    return res.status(413).send({ message: "That image is larger than 3 MB. Choose a smaller one." });
  }
  next(err);
});

export default router;
