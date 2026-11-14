import { Router } from "express";
import * as auth from "../controllers/authController.js";
import { redirectIfLoggedIn, requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/login", redirectIfLoggedIn, auth.loginGet);
router.post("/login", redirectIfLoggedIn, auth.loginPost);
router.post("/login/guest", auth.guestLogin);
router.get("/signup", redirectIfLoggedIn, auth.signupGet);
router.post("/signup", redirectIfLoggedIn, auth.signupPost);
router.post("/logout", requireAuth, auth.logout);

export default router;
