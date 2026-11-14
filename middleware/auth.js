// Route guards.

// "Users must sign in to see anything except the sign-in page."
export function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

// Logged-in users don't need the login/sign-up pages.
export function redirectIfLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return res.redirect("/");
  next();
}
