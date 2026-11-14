import { prisma } from "./prisma.js";

// Everything a post needs to be displayed: author, comments and likes.
// (The spec says posts should always show all four.)
export function postInclude(viewerId) {
  return {
    author: true,
    comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
    _count: { select: { likes: true } },
    // Only load the viewer's own like, to know if they already liked it.
    likes: { where: { userId: viewerId }, select: { userId: true } },
  };
}

// Add simple fields the templates can use directly.
export function decoratePost(post) {
  return { ...post, likeCount: post._count.likes, likedByMe: post.likes.length > 0 };
}

// Ids of the users that `userId` follows (accepted requests only).
export async function followingIds(userId) {
  const follows = await prisma.follow.findMany({
    where: { followerId: userId, status: "ACCEPTED" },
    select: { followingId: true },
  });
  return follows.map((f) => f.followingId);
}
