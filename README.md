# HateyHat Server

This is the backend (server side) of **HateyHat**, a website where people in Bangladesh can create and join social service events like cleanups, tree plantation, blood donation and relief work.

- Live website: https://hateyhat.vercel.app
- Live server: https://hateyhat-server-dun.vercel.app
- Client repo: https://github.com/ssheikhs/HateyHat

## How the website works

1. A user creates an account or logs in (email/password or Google). Login is handled by **BetterAuth** on the client side.
2. Anyone can see the upcoming events, search them by title or location, and filter by event type.
3. A logged in user can create an event. The event is saved with the user's email, so the server knows who the owner is.
4. Only the owner can update or delete their event.
5. A logged in user can join an event once, and can leave it later.
6. The **Joined Events** page shows all events the user joined, sorted by date.

## How the server checks the user (JWT)

- After login, the client gets a **JWT token** from BetterAuth and sends it with every private request:
  `Authorization: Bearer <token>`
- The `verifyToken` middleware checks the token using BetterAuth's public keys (`/api/auth/jwks`).
- No token or a wrong token: **401 Unauthorized**
- Trying to change someone else's event: **403 Forbidden**

## API list

| Method | Route | Login needed | What it does |
| --- | --- | --- | --- |
| GET | `/events/featured` | No | 6 nearest upcoming events (home page) |
| GET | `/events?search=&type=` | No | All upcoming events with search and filter |
| GET | `/events/:id` | No | One event's details |
| GET | `/events/types` | No | List of event types |
| GET | `/stats` | No | Numbers for the home page |
| GET | `/events/mine` | Yes | Events created by me |
| POST | `/events` | Yes | Create an event |
| PATCH | `/events/:id` | Yes (owner) | Update an event |
| DELETE | `/events/:id` | Yes (owner) | Delete an event |
| POST | `/events/:id/join` | Yes | Join an event |
| DELETE | `/events/:id/join` | Yes | Leave an event |
| GET | `/events/:id/join-status` | Yes | Did I join this event? |
| GET | `/events/:id/participants` | Yes (owner) | Who joined my event |
| GET | `/joined-events` | Yes | Events I joined, sorted by date |
| POST | `/images` | No | Upload an image |
| GET | `/images/:id` | No | Show an uploaded image |

## Tech stack

- Node.js and Express.js
- MongoDB (native driver)
- jose (to verify the JWT)
- cors, dotenv
- Vercel (deployment)

## Run it locally

```bash
npm install
npm run dev
```

Create a `.env` file (see `.env.example`):

```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
DB_NAME=hateyhat
CLIENT_URL=http://localhost:3000
```

The server runs on http://localhost:5000
