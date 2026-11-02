<div align="center">

# HateyHat — Server

**The REST API behind [HateyHat](https://hateyhat.vercel.app), a community platform for social service events in Bangladesh.**

Built with **Express 5** and **MongoDB**. Private routes are protected with **JWTs** signed by BetterAuth.

**Live API:** [hateyhat-server-dun.vercel.app](https://hateyhat-server-dun.vercel.app)  
**Website:** [hateyhat.vercel.app](https://hateyhat.vercel.app)  
**Client repo:** [github.com/ssheikhs/HateyHat](https://github.com/ssheikhs/HateyHat)

</div>

---

## What this server does

- **Stores and serves events.** Anyone can read upcoming events; only logged-in users can create them.
- **Shows only future events** on the public list, and the **6 nearest** for the home page using MongoDB's `.limit()`.
- **Search and filter**: search by title or location, filter by event type.
- **Protects ownership.** Only the organizer (the email saved with the event) can update or delete it. Everyone else gets `403 Forbidden`.
- **Handles joining.** Users can join an event **once** (a unique database index blocks duplicates), cannot join their own event or a past one, and can leave.
- **Joined events** come back sorted by event date, earliest first.
- **Image uploads.** Event thumbnails and profile photos can be uploaded and are stored in MongoDB.
- **Validates everything** on the server too: title, description, type, image link, location and a **future** event date.

---

## How authentication works

The website uses **BetterAuth** for login. When the website needs private data it gets a short-lived **JWT** from BetterAuth and sends it to this server:

```
Authorization: Bearer <token>
```

`middleware/verifyToken.js` then:

1. Downloads BetterAuth's **public keys** from `CLIENT_URL/api/auth/jwks` (cached by `jose`).
2. Checks the token's **signature**, **issuer**, **audience** and **expiry**.
3. Puts the user's email on `req.user` for the route to use.

If anything is wrong, the server answers **`401 Unauthorized`**. Because the server only needs the *public* keys, no secret has to be shared between the two apps.

---

## API endpoints

**Public**

| Method | Route | What it returns |
| --- | --- | --- |
| GET | `/` | "server is running" message |
| GET | `/health` | Database connection status |
| GET | `/events` | Upcoming events. Optional `?search=mirpur&type=Cleanup` |
| GET | `/events/featured` | The 6 nearest upcoming events |
| GET | `/events/types` | List of event types |
| GET | `/events/:id` | One event |
| GET | `/stats` | Community numbers for the home page |
| GET | `/images/:id` | An uploaded image |
| POST | `/images` | Upload an image (raw file body, JPG/PNG/WebP/GIF, max 3 MB) |

**Need a JWT**

| Method | Route | What it does |
| --- | --- | --- |
| POST | `/events` | Create an event (creator's email is saved) |
| GET | `/events/mine` | Events created by the logged-in user |
| PATCH | `/events/:id` | Update an event — **owner only** |
| DELETE | `/events/:id` | Delete an event and its joins — **owner only** |
| POST | `/events/:id/join` | Join an event (once only) |
| DELETE | `/events/:id/join` | Leave an event |
| GET | `/events/:id/join-status` | Has the user joined this event? |
| GET | `/events/:id/participants` | Who joined — **owner only** |
| GET | `/joined-events` | Events the user joined, sorted by date |

### Example: create an event

```http
POST /events
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Buriganga Riverbank Cleanup Drive",
  "description": "Join us to clear plastic and waste from the riverbank near Sadarghat...",
  "eventType": "Cleanup",
  "thumbnail": "https://example.com/photo.jpg",
  "location": "Sadarghat, Old Dhaka",
  "eventDate": "2027-01-16T02:00:00.000Z"
}
```

A past date returns `400` with `{ "errors": { "eventDate": "Event date must be in the future" } }`.

---

## Database collections

| Collection | What's inside |
| --- | --- |
| `events` | title, description, eventType, thumbnail, location, eventDate, creatorEmail, creatorName, participantsCount |
| `joins` | eventId, userEmail, userName, a copy of the main event details, joinedAt (unique on `eventId + userEmail`) |
| `images` | uploaded image files |
| `user`, `session`, `account`, `jwks` | created and managed by BetterAuth (from the client) |

---

## Folder structure

```
index.js                # Express app: CORS, JSON, routes, error handler
config/
├── env.js              # Loads .env
└── db.js               # Cached MongoDB connection + indexes
middleware/
└── verifyToken.js      # Checks the BetterAuth JWT
routes/
├── events.js           # List, featured, details, create, mine, update, delete
├── joins.js            # Join, leave, join status, participants, joined events
├── images.js           # Upload and serve images
└── stats.js            # Home page numbers
utils/
└── validateEvent.js    # Server-side event validation
vercel.json             # Vercel deployment settings
```

---

## Run it on your computer

**You need:** Node.js 20+ and a MongoDB database (MongoDB Atlas free tier works).

```bash
git clone https://github.com/ssheikhs/HateyHat-server.git
cd HateyHat-server
npm install
cp .env.example .env    # then fill in the values below
npm run dev
```

Check **http://localhost:5000/health** — it should say `{"ok":true,"database":"connected"}`.

### Environment variables (`.env`)

| Name | What it is | Example |
| --- | --- | --- |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `DB_NAME` | Database name | `hateyhat` |
| `CLIENT_URL` | The website's address (BetterAuth publishes its keys there) | `http://localhost:3000` |
| `PORT` | Port for local development | `5000` |

---

## Deploying to Vercel

1. Import this repo on Vercel (preset **Express**) and add `MONGODB_URI`, `DB_NAME` and `CLIENT_URL`.
2. Set `CLIENT_URL` to the website's live URL, with no trailing `/`.
3. In MongoDB Atlas → Network Access, allow `0.0.0.0/0`.
4. Open `/health` on the deployed URL to confirm the database is connected.

---

Built by **[Sheikh Sazzaduzzaman](https://github.com/ssheikhs)** with Express, MongoDB and jose.
