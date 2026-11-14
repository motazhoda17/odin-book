// Passport setup: how to check a username/password, and how to remember
// the logged-in user between requests (via the session).
import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { prisma } from "../lib/prisma.js";

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } });
      // Same message for both cases so nobody can probe which usernames exist.
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return done(null, false, { message: "Incorrect username or password." });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }),
);

// Only the user's id is stored in the session cookie...
passport.serializeUser((user, done) => done(null, user.id));

// ...and on every request we load the full user from the database.
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

export default passport;
