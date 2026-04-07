import type { FastifyRequest, FastifyReply } from "fastify";
import { createClerkClient } from "@clerk/backend";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

export async function authMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = await clerk.verifyToken(token!);
    (req as any).auth = { userId: payload.sub };
  } catch {
    return reply.status(401).send({ error: "Invalid token" });
  }
}
