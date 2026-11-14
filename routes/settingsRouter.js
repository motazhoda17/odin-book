import { Router } from "express";
import * as settings from "../controllers/settingsController.js";

const router = Router();

router.get("/", settings.settingsGet);
router.post("/", settings.settingsPost);

export default router;
