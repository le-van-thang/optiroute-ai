const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'testadmin@gmail.com';
  const user = await prisma.user.update({
    where: { email },
    data: { role: 'ADMIN' },
  });
  console.log(`Promoted ${email} to ADMIN:`, user.role);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
