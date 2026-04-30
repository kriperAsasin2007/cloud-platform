import { PrismaClient } from '@prisma/client/users';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const USERS = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Alice Admin', username: 'alice', password: 'alice123' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Bob Builder', username: 'bob', password: 'bob123' },
  { id: '00000000-0000-0000-0000-000000000003', name: 'Carol Cloud', username: 'carol', password: 'carol123' },
];

async function main() {
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { id: u.id },
      create: { id: u.id, name: u.name, username: u.username, passwordHash },
      update: { name: u.name, username: u.username, passwordHash },
    });
    console.log(`Seeded user: ${u.username}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
