import { avatarFor } from "../lib/avatar.js";
import { timeAgo } from "../lib/time.js";

// Values every view can use without passing them in render() each time.
export function setLocals(req, res, next) {
  res.locals.currentUser = req.user || null;
  res.locals.currentPath = req.originalUrl;
  res.locals.avatarFor = avatarFor;
  res.locals.timeAgo = timeAgo;

  // "Flash" messages: saved in the session, shown once on the next page.
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  req.flash = (type, message) => {
    req.session.flash = { type, message };
  };
  next();
}

// Where to send the user after a form like "Like" or "Follow".
// Forms include a hidden returnTo field with the page they came from.
// We only allow paths on our own site (starting with a single "/").
export function safeReturnTo(req, fallback = "/") {
  const target = req.body?.returnTo;
  if (typeof target === "string" && target.startsWith("/") && !target.startsWith("//")) {
    return target;
  }
  return fallback;
}
