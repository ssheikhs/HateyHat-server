import { createRemoteJWKSet, jwtVerify } from "jose";

// BetterAuth (running in the Next.js client) signs JWTs with its JWT plugin
// and publishes the public keys at /api/auth/jwks. We verify every protected
// request against those keys, so the server never needs the private key.
const authOrigin = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")[0]
  .trim()
  .replace(/\/$/, "");

const JWKS = createRemoteJWKSet(new URL(`${authOrigin}/api/auth/jwks`));

export async function verifyToken(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).send({ message: "Unauthorized: token missing" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: authOrigin,
      audience: authOrigin,
    });

    if (!payload.email) {
      return res.status(401).send({ message: "Unauthorized: invalid token" });
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      image: payload.image,
    };
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized: invalid or expired token" });
  }
}
