import { Router } from "express";
import * as posts from "../controllers/postController.js";

const router = Router();

router.post("/", posts.createPost);
router.get("/:id", posts.showPost);
router.post("/:id/like", posts.toggleLike);
router.post("/:id/comments", posts.addComment);
router.post("/:id/delete", posts.deletePost);

export default router;
