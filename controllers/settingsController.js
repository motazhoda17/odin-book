import { body, validationResult } from "express-validator";
import { prisma } from "../lib/prisma.js";
import { GUEST_USERNAME } from "./authController.js";

function renderForm(res, values, errors = [], status = 200) {
  res.status(status).render("settings", { title: "Edit profile", values, errors });
}

// GET /settings - edit my profile
export function settingsGet(req, res) {
  const { displayName, bio, email, avatarUrl } = req.user;
  renderForm(res, { displayName, bio, email, avatarUrl });
}

// POST /settings
export const settingsPost = [
  body("displayName").trim().isLength({ min: 1, max: 50 }).withMessage("Name must be 1-50 characters."),
  body("bio").trim().isLength({ max: 300 }).withMessage("Bio must be at most 300 characters."),
  body("email")
    .optional({ values: "falsy" })
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email (or leave it blank).")
    .normalizeEmail(),
  body("avatarUrl")
    .optional({ values: "falsy" })
    .trim()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("Photo must be a full image URL starting with http:// or https://"),
  async (req, res) => {
    // Everyone shares the guest account, so keep its profile fixed.
    if (req.user.username === GUEST_USERNAME) {
      req.flash("error", "The guest profile can't be edited. Sign up to make your own!");
      return res.redirect("/settings");
    }
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return renderForm(res, req.body, result.array().map((e) => e.msg), 400);
    }
    const { displayName, bio = "", email = "", avatarUrl = "" } = req.body;
    await prisma.user.update({
      where: { id: req.user.id },
      data: { displayName, bio, email: email || "", avatarUrl: avatarUrl || "" },
    });
    req.flash("success", "Profile updated.");
    res.redirect(`/users/${req.user.id}`);
  },
];
