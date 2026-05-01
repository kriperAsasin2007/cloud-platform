import { PrismaClient } from '@prisma/client/users';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const USERS = [
  {
    id: 'ae3d9431-7d56-45cd-af3c-161fbf6da5be',
    name: 'Alice Admin',
    username: 'alice',
    password: 'alice123',
  },
  {
    id: '2be1d783-02a1-4534-a30d-043320243fe2',
    name: 'Bob Builder',
    username: 'bob',
    password: 'bob123',
  },
  {
    id: '07161a9f-f396-4bd9-a7bc-42d4a3bc8980',
    name: 'Carol Cloud',
    username: 'carol',
    password: 'carol123',
  },
  {
    id: 'f70f826b-7e39-4086-8535-7ed84792abfd',
    name: 'Test User',
    username: 'test',
    password: 'test123',
  },
];

async function main() {
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);

    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        id: u.id,
        name: u.name,
        passwordHash,
      },
      create: {
        id: u.id,
        name: u.name,
        username: u.username,
        passwordHash,
      },
    });
  }
  console.log('Seeded users');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
