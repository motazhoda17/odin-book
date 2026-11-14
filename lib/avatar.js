import crypto from "node:crypto";

// Gravatar turns an email address into a profile picture.
// If the person has no Gravatar account, "identicon" draws a unique pattern.
// https://docs.gravatar.com/api/avatars/images/
export function gravatarUrl(text, size = 160) {
  const hash = crypto.createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=${size}`;
}

// The picture to show for a user: their custom photo if they set one,
// otherwise a Gravatar based on their email (or username if no email).
export function avatarFor(user, size = 160) {
  if (user.avatarUrl) return user.avatarUrl;
  return gravatarUrl(user.email || user.username, size);
}
