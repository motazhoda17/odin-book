import { Router } from "express";
import * as follows from "../controllers/followController.js";
import * as users from "../controllers/userController.js";

const router = Router();

router.get("/", users.listUsers);
router.get("/:id", users.showProfile);
router.post("/:id/follow", follows.sendRequest);
router.post("/:id/unfollow", follows.unfollow);

export default router;
