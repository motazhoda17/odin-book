import { Router } from "express";
import * as follows from "../controllers/followController.js";

const router = Router();

router.get("/", follows.listRequests);
router.post("/:followerId/accept", follows.acceptRequest);
router.post("/:followerId/decline", follows.declineRequest);

export default router;
