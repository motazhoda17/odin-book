# Odin-Book

A small Facebook-style social network built for [The Odin Project – Odin-Book](https://www.theodinproject.com/lessons/node-path-nodejs-odin-book) lesson (Full Stack JavaScript path, final Node.js project).

Users sign in, send follow requests, write posts, like and comment, and see a feed of their own posts plus posts from the people they follow.

**Stack:** Node.js, Express 5, EJS templates, Passport (`passport-local`), PostgreSQL, Prisma 7, `connect-pg-simple` sessions, `@faker-js/faker` for seed data.

## Features

Core requirements from the lesson:

- Users must sign in to see anything except the login / sign-up pages
- Sign up and log in with username + password (Passport local strategy, bcrypt-hashed passwords)
- Send follow requests; the other user can **accept** or **decline** them on the Requests page
- Create text posts
- Like / unlike posts
- Comment on posts
- Every post shows its content, author, comments and likes
- Home feed with recent posts from you and the people you follow (plus an "Everyone" tab to discover new people)
- Profile pictures from [Gravatar](https://gravatar.com) (based on the user's email, or their username if no email is given)
- Profile page with the user's info, photo, follower counts and posts
- Users index with a Follow / Requested / Following / Accept button for each person
- Seed script that fills the database with fake users, follows, posts, likes and comments

Extra credit:

- **Guest sign-in** ("Continue as guest") so recruiters can look around without an account
- Posts can include an image (by URL)
- Users can change their profile photo (by URL) and edit their name, bio and email
- Responsive design that works on phones

## Data model

```
User ──< Post ──< Comment >── User
  │        └────< Like >───── User
  └──< Follow >── User        (followerId → followingId, status PENDING | ACCEPTED)
```

A follow request is a `Follow` row with status `PENDING`; accepting it flips the status to `ACCEPTED`. Only accepted follows put posts in your feed. See `prisma/schema.prisma` for details.

## Project structure

```
app.js                 Express setup: sessions, Passport, routers
config/passport.js     Passport local strategy
controllers/           request handlers (auth, posts, users, follows, settings)
routes/                URL -> controller mapping
middleware/            requireAuth, shared view variables, flash messages
lib/                   Prisma client, Gravatar helper, query helpers
views/                 EJS pages and partials
public/styles.css      all the CSS
prisma/schema.prisma   database models
prisma/migrations/     SQL migrations
prisma/seeds.js        fake data generator
```

## Running it locally

You need **Node.js 20+** and **PostgreSQL**.

### 1. Create a database

```bash
psql postgres
CREATE ROLE odinbook WITH LOGIN PASSWORD 'choose-a-password' CREATEDB;
CREATE DATABASE odin_book OWNER odinbook;
\q
```

(`CREATEDB` lets `prisma migrate dev` create its temporary "shadow" database.)

### 2. Configure environment variables

```bash
cp .env.example .env
```

| Variable | Example | Notes |
| -------- | ------- | ----- |
| `DATABASE_URL` | `postgresql://odinbook:choose-a-password@localhost:5432/odin_book` | your database |
| `SESSION_SECRET` | a long random string | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `PORT` | `3000` | optional |

### 3. Install, migrate, seed and run

```bash
npm install              # also runs `prisma generate`
npx prisma migrate dev   # creates all tables (including the session table)
npm run seed             # optional: fake users/posts. Deletes existing data!
npm run dev              # http://localhost:3000
```

After seeding you can log in as **demo / password123** (every seeded user has the password `password123`), or click **Continue as guest**.

## Deployment notes

Any Node host with PostgreSQL works (Render, Railway, Koyeb, Fly.io...). Example for Render:

1. Create a PostgreSQL database (Render, Neon or Supabase) and copy its connection string.
2. Create a **Web Service** from this repo.
   - Build command: `npm install && npx prisma migrate deploy`
   - Start command: `npm start`
   - Environment variables: `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV=production`
3. Run `npm run seed` once from the service's shell so the site has content and the guest account follows people.

`NODE_ENV=production` turns on secure (HTTPS-only) cookies; `app.set("trust proxy", 1)` makes that work behind the host's proxy.

## What I practiced

- Planning a bigger relational data model (self-referencing many-to-many `Follow` with a status)
- Prisma 7 with the `@prisma/adapter-pg` driver adapter, migrations and nested queries (`include`, `_count`)
- Session-based authentication with Passport, bcrypt and sessions stored in PostgreSQL
- Protecting every route except the auth pages with one middleware
- Server-side validation with express-validator and re-rendering forms with errors
- EJS partials to reuse the post card and follow button everywhere
- Generating realistic seed data with Faker
- Small UX touches: flash messages, redirecting back to the same post after liking (`#post-12`), guest login
