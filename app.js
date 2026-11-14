import "dotenv/config";
import connectPgSimple from "connect-pg-simple";
import express from "express";
import session from "express-session";
import path from "node:path";
import passport from "./config/passport.js";
import { prisma } from "./lib/prisma.js";
import { requireAuth } from "./middleware/auth.js";
import { setLocals } from "./middleware/locals.js";
import authRouter from "./routes/authRouter.js";
import postRouter from "./routes/postRouter.js";
import requestRouter from "./routes/requestRouter.js";
import settingsRouter from "./routes/settingsRouter.js";
import userRouter from "./routes/userRouter.js";
import { feed } from "./controllers/postController.js";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing. Copy .env.example to .env and fill it in.");
}

const app = express();
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

app.set("views", path.join(import.meta.dirname, "views"));
app.set("view engine", "ejs");

// Hosts like Render sit behind a proxy; this lets secure cookies work there.
app.set("trust proxy", 1);

app.use(express.static(path.join(import.meta.dirname, "public")));
app.use(express.urlencoded({ extended: false }));

// Sessions are stored in PostgreSQL (the "session" table, created by our
// Prisma migration), so users stay logged in even if the server restarts.
const PgSession = connectPgSimple(session);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: ONE_WEEK_MS,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: "session",
    }),
  }),
);
app.use(passport.session());
app.use(setLocals);

// Show a badge with the number of follow requests waiting for me.
app.use(async (req, res, next) => {
  res.locals.pendingRequestCount = req.user
    ? await prisma.follow.count({ where: { followingId: req.user.id, status: "PENDING" } })
    : 0;
  next();
});

// Public routes: only the login / sign-up pages.
app.use("/", authRouter);

// Everything below requires a logged-in user.
app.use(requireAuth);
app.get("/", feed);
app.use("/posts", postRouter);
app.use("/users", userRouter);
app.use("/requests", requestRouter);
app.use("/settings", settingsRouter);

app.use((req, res) => {
  res.status(404).render("error", { title: "Not found", message: "We couldn't find that page." });
});

// Express 5 sends errors from async handlers here automatically.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error", { title: "Error", message: "Something went wrong on our end." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Odin-Book running on http://localhost:${PORT}`));
