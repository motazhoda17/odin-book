import { prisma } from "../lib/prisma.js";
import { safeReturnTo } from "../middleware/locals.js";

// POST /users/:id/follow - send a follow request
export async function sendRequest(req, res) {
  const targetId = Number(req.params.id);
  const target = await prisma.user.findUnique({ where: { id: targetId } });

  if (!target || targetId === req.user.id) {
    req.flash("error", "You can't follow that user.");
  } else {
    // upsert = "create it, or do nothing if it already exists".
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: req.user.id, followingId: targetId } },
      create: { followerId: req.user.id, followingId: targetId },
      update: {},
    });
    req.flash("success", `Follow request sent to ${target.displayName}.`);
  }
  res.redirect(safeReturnTo(req, "/users"));
}

// POST /users/:id/unfollow - unfollow, or cancel a pending request
export async function unfollow(req, res) {
  await prisma.follow.deleteMany({ where: { followerId: req.user.id, followingId: Number(req.params.id) } });
  res.redirect(safeReturnTo(req, "/users"));
}

// GET /requests - follow requests other people sent me
export async function listRequests(req, res) {
  const [incoming, outgoing] = await Promise.all([
    prisma.follow.findMany({
      where: { followingId: req.user.id, status: "PENDING" },
      include: { follower: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.follow.findMany({
      where: { followerId: req.user.id, status: "PENDING" },
      include: { following: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  res.render("requests", { title: "Follow requests", incoming, outgoing });
}

// POST /requests/:followerId/accept
export async function acceptRequest(req, res) {
  const { count } = await prisma.follow.updateMany({
    where: { followerId: Number(req.params.followerId), followingId: req.user.id, status: "PENDING" },
    data: { status: "ACCEPTED" },
  });
  if (count) req.flash("success", "Request accepted. They can now see your posts in their feed.");
  res.redirect(safeReturnTo(req, "/requests"));
}

// POST /requests/:followerId/decline
export async function declineRequest(req, res) {
  await prisma.follow.deleteMany({
    where: { followerId: Number(req.params.followerId), followingId: req.user.id, status: "PENDING" },
  });
  res.redirect(safeReturnTo(req, "/requests"));
}
