import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { body, validationResult } from "express-validator";
import passport from "../config/passport.js";
import { prisma } from "../lib/prisma.js";

export const GUEST_USERNAME = "guest";

export function loginGet(req, res) {
  res.render("login", { title: "Log in", errors: [], values: {} });
}

export function loginPost(req, res, next) {
  // Custom callback so we can re-render the form with an error message.
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res
        .status(401)
        .render("login", { title: "Log in", errors: [info?.message || "Login failed."], values: req.body });
    }
    req.login(user, (loginErr) => (loginErr ? next(loginErr) : res.redirect("/")));
  })(req, res, next);
}

export function signupGet(req, res) {
  res.render("signup", { title: "Sign up", errors: [], values: {} });
}

export const signupPost = [
  body("username")
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9_]{3,20}$/)
    .withMessage("Username must be 3-20 characters: letters, numbers or underscores.")
    .custom(async (username) => {
      if (await prisma.user.findUnique({ where: { username } })) {
        throw new Error("That username is already taken.");
      }
    }),
  body("displayName").trim().isLength({ min: 1, max: 50 }).withMessage("Name must be 1-50 characters."),
  body("email")
    .optional({ values: "falsy" })
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email (or leave it blank).")
    .normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
  body("confirmPassword")
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords do not match."),
  async (req, res, next) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(400).render("signup", {
        title: "Sign up",
        errors: result.array().map((e) => e.msg),
        values: req.body,
      });
    }
    const { username, displayName, email, password } = req.body;
    const user = await prisma.user.create({
      data: { username, displayName, email: email || "", passwordHash: await bcrypt.hash(password, 10) },
    });
    // Log the new user straight in.
    req.login(user, (err) => {
      if (err) return next(err);
      req.flash("success", `Welcome to Odin-Book, ${user.displayName}! Find some people to follow.`);
      res.redirect("/users");
    });
  },
];

// Recruiters can look around without signing up.
// Everyone who clicks the button shares one "guest" account.
export async function guestLogin(req, res, next) {
  let guest = await prisma.user.findUnique({ where: { username: GUEST_USERNAME } });

  if (!guest) {
    guest = await prisma.user.create({
      data: {
        username: GUEST_USERNAME,
        displayName: "Guest User",
        bio: "Just visiting! 👋",
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
      },
    });
    // Follow a few people so the guest's feed isn't empty.
    const others = await prisma.user.findMany({ where: { id: { not: guest.id } }, take: 5 });
    await prisma.follow.createMany({
      data: others.map((u) => ({ followerId: guest.id, followingId: u.id, status: "ACCEPTED" })),
    });
  }

  req.login(guest, (err) => {
    if (err) return next(err);
    req.flash("success", "You're browsing as a guest. Feel free to post, like and follow!");
    res.redirect("/");
  });
}

export function logout(req, res, next) {
  req.logout((err) => (err ? next(err) : res.redirect("/login")));
}
