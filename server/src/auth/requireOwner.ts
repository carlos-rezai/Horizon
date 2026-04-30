import type { Request, Response, NextFunction } from "express";
import { OAuth2Client } from "google-auth-library";

type ClientLike = { verifyIdToken: OAuth2Client["verifyIdToken"] };

function createClient(audience: string | undefined): ClientLike {
  type Ctor = new (a?: string) => ClientLike;
  type Fn = (a?: string) => ClientLike;
  const lib = OAuth2Client as unknown as Ctor & Fn;
  try {
    return new lib(audience);
  } catch (err) {
    if (err instanceof TypeError && /not a constructor/i.test(err.message)) {
      return lib(audience);
    }
    throw err;
  }
}

export async function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = header.slice("Bearer ".length).trim();
  if (token.length === 0) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ownerSub = process.env.OWNER_GOOGLE_SUB;
  const audience = process.env.GOOGLE_CLIENT_ID;

  try {
    const client = createClient(audience);
    const ticket = await client.verifyIdToken({ idToken: token, audience });
    const payload = ticket.getPayload();
    if (!payload || payload.sub !== ownerSub) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
