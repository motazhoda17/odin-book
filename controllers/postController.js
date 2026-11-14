import { body, validationResult } from "express-validator";
import { safeReturnTo } from "../middleware/locals.js";
import { prisma } from "../lib/prisma.js";
import { decoratePost, followingIds, postInclude } from "../lib/posts.js";

const FEED_LIMIT = 50;

// GET /  - the home feed.
// Default: my posts + posts from people I follow.
// ?view=everyone shows the latest posts from all users (handy for discovering people).
export async function feed(req, res) {
  const view = req.query.view === "everyone" ? "everyone" : "following";
  const where =
    view === "everyone" ? {} : { authorId: { in: [req.user.id, ...(await followingIds(req.user.id))] } };

  const posts = await prisma.post.findMany({
    where,
    include: postInclude(req.user.id),
    orderBy: { createdAt: "desc" },
    take: FEED_LIMIT,
  });

  res.render("feed", { title: "Home", posts: posts.map(decoratePost), view, errors: [], values: {} });
}

const postRules = [
  body("content").trim().isLength({ min: 1, max: 1000 }).withMessage("Posts must be 1-1000 characters."),
  body("imageUrl")
    .optional({ values: "falsy" })
    .trim()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("Image must be a full URL starting with http:// or https://"),
];

// POST /posts
export const createPost = [
  ...postRules,
  async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      req.flash("error", result.array().map((e) => e.msg).join(" "));
      return res.redirect(safeReturnTo(req, "/"));
    }
    await prisma.post.create({
      data: { content: req.body.content, imageUrl: req.body.imageUrl || "", authorId: req.user.id },
    });
    req.flash("success", "Posted!");
    res.redirect(safeReturnTo(req, "/"));
  },
];

// GET /posts/:id - a single post page
export async function showPost(req, res) {
  const post = await prisma.post.findUnique({
    where: { id: Number(req.params.id) || 0 },
    include: postInclude(req.user.id),
  });
  if (!post) return res.status(404).render("error", { title: "Not found", message: "That post doesn't exist." });
  res.render("post", { title: `Post by ${post.author.displayName}`, post: decoratePost(post) });
}

// POST /posts/:id/like - like if not liked yet, otherwise unlike.
export async function toggleLike(req, res) {
  const postId = Number(req.params.id);
  const key = { userId_postId: { userId: req.user.id, postId } };
  const existing = await prisma.like.findUnique({ where: key });
  if (existing) {
    await prisma.like.delete({ where: key });
  } else if (await prisma.post.findUnique({ where: { id: postId } })) {
    await prisma.like.create({ data: { userId: req.user.id, postId } });
  }
  // "#post-12" scrolls the page back to the post that was liked.
  res.redirect(`${safeReturnTo(req, "/")}#post-${postId}`);
}

// POST /posts/:id/comments
export const addComment = [
  body("content").trim().isLength({ min: 1, max: 500 }).withMessage("Comments must be 1-500 characters."),
  async (req, res) => {
    const postId = Number(req.params.id);
    const result = validationResult(req);
    if (!result.isEmpty()) {
      req.flash("error", result.array()[0].msg);
    } else if (await prisma.post.findUnique({ where: { id: postId } })) {
      await prisma.comment.create({ data: { content: req.body.content, postId, authorId: req.user.id } });
    }
    res.redirect(`${safeReturnTo(req, "/")}#post-${postId}`);
  },
];

// POST /posts/:id/delete - only the author can delete a post.
export async function deletePost(req, res) {
  const { count } = await prisma.post.deleteMany({
    where: { id: Number(req.params.id), authorId: req.user.id },
  });
  req.flash(count ? "success" : "error", count ? "Post deleted." : "You can only delete your own posts.");
  const returnTo = safeReturnTo(req, "/");
  // Don't send the user back to the page of the post they just deleted.
  res.redirect(returnTo.startsWith("/posts/") ? "/" : returnTo);
}
