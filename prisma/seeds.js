// Fills the database with fake users, posts, comments, likes and follows
// using @faker-js/faker. Run with: npm run seed
// WARNING: this deletes all existing data first!
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

const USER_COUNT = 20;
const DEMO_PASSWORD = "password123";

// Same fake data every run, which makes debugging easier.
faker.seed(42);

// Pick `count` random items from an array.
function sample(array, count) {
  return faker.helpers.arrayElements(array, Math.min(count, array.length));
}

async function main() {
  console.log("Clearing old data…");
  // Deleting users cascades to their posts, likes, comments and follows.
  await prisma.user.deleteMany();
  await prisma.session.deleteMany();

  // Hashing is slow on purpose, so hash the shared demo password once.
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log("Creating users…");
  const users = [];

  // Two known accounts: the guest (for the "Continue as guest" button) and a demo user.
  users.push(
    await prisma.user.create({
      data: { username: "guest", displayName: "Guest User", bio: "Just visiting! 👋", passwordHash },
    }),
    await prisma.user.create({
      data: {
        username: "demo",
        displayName: "Demo Person",
        email: "demo@example.com",
        bio: "I'm the demo account. Log in as demo / password123.",
        passwordHash,
      },
    }),
  );

  for (let i = 0; i < USER_COUNT; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    users.push(
      await prisma.user.create({
        data: {
          username: faker.internet
            .username({ firstName, lastName })
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "_")
            .slice(0, 16) + i,
          displayName: `${firstName} ${lastName}`,
          // Fake emails give everyone a different Gravatar identicon.
          email: faker.internet.email({ firstName, lastName }).toLowerCase(),
          bio: faker.person.bio(),
          passwordHash,
        },
      }),
    );
  }

  console.log("Creating follows…");
  const follows = [];
  for (const user of users) {
    const others = users.filter((u) => u.id !== user.id);
    for (const target of sample(others, faker.number.int({ min: 3, max: 8 }))) {
      // Most requests were accepted, a few are still waiting.
      follows.push({
        followerId: user.id,
        followingId: target.id,
        status: faker.datatype.boolean(0.8) ? "ACCEPTED" : "PENDING",
      });
    }
  }
  await prisma.follow.createMany({ data: follows, skipDuplicates: true });

  console.log("Creating posts, comments and likes…");
  for (const author of users.slice(1)) {
    for (let i = 0; i < faker.number.int({ min: 1, max: 4 }); i++) {
      const post = await prisma.post.create({
        data: {
          authorId: author.id,
          content: faker.lorem.sentences({ min: 1, max: 3 }),
          // About 1 in 5 posts gets a placeholder picture.
          imageUrl: faker.datatype.boolean(0.2) ? faker.image.urlPicsumPhotos({ width: 640, height: 400 }) : "",
          createdAt: faker.date.recent({ days: 21 }),
        },
      });

      await prisma.like.createMany({
        data: sample(users, faker.number.int({ min: 0, max: 10 })).map((u) => ({ userId: u.id, postId: post.id })),
      });

      for (const commenter of sample(users, faker.number.int({ min: 0, max: 3 }))) {
        await prisma.comment.create({
          data: {
            postId: post.id,
            authorId: commenter.id,
            content: faker.lorem.sentence(),
            createdAt: faker.date.between({ from: post.createdAt, to: new Date() }),
          },
        });
      }
    }
  }

  const postCount = await prisma.post.count();
  console.log(`Done! ${users.length} users, ${follows.length} follows, ${postCount} posts.`);
  console.log(`Every seeded user's password is "${DEMO_PASSWORD}" (try username "demo").`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
