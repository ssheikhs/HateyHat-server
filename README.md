# HateyHat — Server

REST API for **HateyHat** (হাতে হাত — "hand in hand"), a community platform where people create, join and track social development events (cleanups, plantations, donation drives and more).

🔗 **Client repo:** https://github.com/ssheikhs/HateyHat

Built with **Express 5**, **MongoDB** and **JWT** verification against the BetterAuth JWKS published by the Next.js client.

## Features

- Public upcoming-events API that only returns events whose date is still ahead, with search by title/location and filter by event type
- Home page feed of the 6 nearest upcoming events using MongoDB `.limit()`
- Protected create / update / delete routes — only the organizer of an event can change or remove it
- Join and leave events, with duplicate-join and organizer-join protection (unique index on `eventId + userEmail`)
- Joined events list sorted by event date, organizer-only participant list and public community stats
- Server-side validation for every event field, including a future-only event date
- Image uploads stored in MongoDB, so event thumbnails and profile photos can come straight from the user's computer

## API

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| GET | `/events` | – | Upcoming events (`?search=&type=`) |
| GET | `/events/featured` | – | 6 nearest upcoming events |
| GET | `/events/types` | – | Available event types |
| GET | `/events/:id` | – | Event details |
| POST | `/events` | JWT | Create event |
| GET | `/events/mine` | JWT | Events created by me |
| PATCH | `/events/:id` | JWT (owner) | Update event |
| DELETE | `/events/:id` | JWT (owner) | Delete event and its joins |
| POST | `/events/:id/join` | JWT | Join event |
| DELETE | `/events/:id/join` | JWT | Leave event |
| GET | `/events/:id/join-status` | JWT | Have I joined? |
| GET | `/events/:id/participants` | JWT (owner) | Participant list |
| GET | `/joined-events` | JWT | My joined events, sorted by date |
| GET | `/stats` | – | Community impact numbers |
| POST | `/images` | – | Upload an image file (raw body, max 3 MB) |
| GET | `/images/:id` | – | Serve an uploaded image |

## How authentication works

The Next.js client runs BetterAuth with the JWT plugin. The browser asks BetterAuth for a short-lived token (`/api/auth/token`) and sends it as `Authorization: Bearer <token>`. This server verifies the signature with the public keys at `CLIENT_URL/api/auth/jwks` (issuer and audience must equal `CLIENT_URL`).

## Run locally

```bash
npm install
cp .env.example .env   # fill in MONGODB_URI and CLIENT_URL
npm run dev
```

## Environment variables

| Name | Example |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `DB_NAME` | `hateyhat` |
| `CLIENT_URL` | `http://localhost:3000` (live: your client Vercel URL) |
| `PORT` | `5000` |
