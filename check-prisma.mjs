import { prisma } from '@society/database';
try {
  const n = await prisma.user.count();
  console.log('prisma connected, users:', n);
} catch (e) {
  console.log('prisma failed:', String(e).slice(0, 600));
} finally {
  await prisma.$disconnect();
}
