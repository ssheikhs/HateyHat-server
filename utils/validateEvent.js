export const EVENT_TYPES = [
  "Cleanup",
  "Plantation",
  "Donation",
  "Food Drive",
  "Blood Donation",
  "Education",
  "Healthcare",
  "Relief",
];

const isValidUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Validates event input. Returns { errors, data } where data is the
 * cleaned document ready to be saved.
 * `partial` lets the update route accept only the fields being changed.
 */
export function validateEvent(body = {}, { partial = false } = {}) {
  const errors = {};
  const data = {};

  const has = (key) => body[key] !== undefined;

  if (!partial || has("title")) {
    const title = String(body.title ?? "").trim();
    if (title.length < 5 || title.length > 100) {
      errors.title = "Title must be between 5 and 100 characters";
    } else data.title = title;
  }

  if (!partial || has("description")) {
    const description = String(body.description ?? "").trim();
    if (description.length < 20 || description.length > 2000) {
      errors.description = "Description must be between 20 and 2000 characters";
    } else data.description = description;
  }

  if (!partial || has("eventType")) {
    if (!EVENT_TYPES.includes(body.eventType)) {
      errors.eventType = "Please choose a valid event type";
    } else data.eventType = body.eventType;
  }

  if (!partial || has("thumbnail")) {
    const thumbnail = String(body.thumbnail ?? "").trim();
    if (!isValidUrl(thumbnail)) {
      errors.thumbnail = "Thumbnail must be a valid image URL";
    } else data.thumbnail = thumbnail;
  }

  if (!partial || has("location")) {
    const location = String(body.location ?? "").trim();
    if (location.length < 3 || location.length > 150) {
      errors.location = "Location must be between 3 and 150 characters";
    } else data.location = location;
  }

  if (!partial || has("eventDate")) {
    const date = new Date(body.eventDate);
    if (!body.eventDate || Number.isNaN(date.getTime())) {
      errors.eventDate = "Please provide a valid event date";
    } else if (date.getTime() <= Date.now()) {
      errors.eventDate = "Event date must be in the future";
    } else data.eventDate = date;
  }

  return { errors, data, isValid: Object.keys(errors).length === 0 };
}
