import { prisma } from "../lib/prisma.js";
import { getRelationships } from "../lib/follows.js";
import { decoratePost, postInclude } from "../lib/posts.js";

// GET /users - index of all users with follow buttons
export async function listUsers(req, res) {
  const [users, relationshipTo] = await Promise.all([
    prisma.user.findMany({
      where: { id: { not: req.user.id } },
      orderBy: { displayName: "asc" },
      include: { _count: { select: { posts: true } } },
    }),
    getRelationships(req.user.id),
  ]);

  const withRelationship = users.map((u) => ({ ...u, relationship: relationshipTo(u.id) }));
  res.render("users", { title: "People", users: withRelationship });
}

// GET /users/:id - a profile page with info, photo and posts
export async function showProfile(req, res) {
  const id = Number(req.params.id) || 0;
  const profile = await prisma.user.findUnique({
    where: { id },
    include: {
      posts: { include: postInclude(req.user.id), orderBy: { createdAt: "desc" } },
    },
  });
  if (!profile) return res.status(404).render("error", { title: "Not found", message: "That user doesn't exist." });

  // Only accepted follows count as followers/following.
  const [followerCount, followingCount, relationshipTo] = await Promise.all([
    prisma.follow.count({ where: { followingId: id, status: "ACCEPTED" } }),
    prisma.follow.count({ where: { followerId: id, status: "ACCEPTED" } }),
    getRelationships(req.user.id),
  ]);

  res.render("profile", {
    title: profile.displayName,
    profile,
    posts: profile.posts.map(decoratePost),
    followerCount,
    followingCount,
    relationship: relationshipTo(profile.id),
    isMe: profile.id === req.user.id,
  });
}
