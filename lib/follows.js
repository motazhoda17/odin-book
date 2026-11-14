import { prisma } from "./prisma.js";

// Works out how the viewer is connected to every other user, so pages
// can show the right button:
//   "following" - viewer follows them (request accepted)
//   "requested" - viewer sent a request that's still pending
//   "incoming"  - they sent the viewer a request
//   "none"      - no connection yet
export async function getRelationships(viewerId) {
  const [outgoing, incoming] = await Promise.all([
    prisma.follow.findMany({ where: { followerId: viewerId } }),
    prisma.follow.findMany({ where: { followingId: viewerId, status: "PENDING" } }),
  ]);
  const outgoingStatus = new Map(outgoing.map((f) => [f.followingId, f.status]));
  const incomingIds = new Set(incoming.map((f) => f.followerId));

  return (userId) => {
    const status = outgoingStatus.get(userId);
    if (status === "ACCEPTED") return "following";
    if (status === "PENDING") return "requested";
    if (incomingIds.has(userId)) return "incoming";
    return "none";
  };
}
