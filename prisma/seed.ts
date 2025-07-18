import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      displayName: 'Admin User',
      passwordHash: adminPasswordHash,
      isAdmin: true,
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create test users
  const testUsers = [];
  for (let i = 1; i <= 5; i++) {
    const passwordHash = await bcrypt.hash(`user${i}pass`, 10);
    const user = await prisma.user.upsert({
      where: { email: `user${i}@example.com` },
      update: {},
      create: {
        email: `user${i}@example.com`,
        displayName: `Test User ${i}`,
        passwordHash,
        isAdmin: false,
      },
    });
    testUsers.push(user);
  }

  console.log(`✅ Created ${testUsers.length} test users`);

  // Create a sample board
  const sampleBoard = await prisma.board.upsert({
    where: { id: 'sample-board-1' },
    update: {},
    create: {
      id: 'sample-board-1',
      name: '2024 March Madness Championship',
      pricePerSquare: 25.0,
      status: 'OPEN',
    },
  });

  console.log('✅ Created sample board:', sampleBoard.name);

  // Create payout structure for the sample board
  const payoutStructure = await prisma.payoutStructure.upsert({
    where: { boardId: sampleBoard.id },
    update: {},
    create: {
      boardId: sampleBoard.id,
      round1: 25.0,
      round2: 50.0,
      sweet16: 100.0,
      elite8: 200.0,
      final4: 400.0,
      championship: 800.0,
    },
  });

  console.log('✅ Created payout structure for sample board');

  // Create some sample squares (claimed by test users)
  const sampleSquares = [];
  for (let i = 0; i < 10; i++) {
    const user = testUsers[i % testUsers.length];
    const square = await prisma.square.create({
      data: {
        boardId: sampleBoard.id,
        userId: user?.id || null,
        paymentStatus: i < 5 ? 'PAID' : 'PENDING', // First 5 are paid
      },
    });
    sampleSquares.push(square);
  }

  console.log(`✅ Created ${sampleSquares.length} sample squares`);

  // Create sample games for the tournament
  const sampleGames = [
    {
      gameNumber: 1,
      round: 'Round 1',
      team1: 'Duke',
      team2: 'Vermont',
      scheduledTime: new Date('2024-03-21T12:00:00Z'),
    },
    {
      gameNumber: 2,
      round: 'Round 1',
      team1: 'North Carolina',
      team2: 'Wagner',
      scheduledTime: new Date('2024-03-21T14:30:00Z'),
    },
    {
      gameNumber: 33,
      round: 'Round 2',
      team1: 'TBD',
      team2: 'TBD',
      scheduledTime: new Date('2024-03-23T15:00:00Z'),
    },
  ];

  for (const gameData of sampleGames) {
    await prisma.game.upsert({
      where: {
        boardId_gameNumber: {
          boardId: sampleBoard.id,
          gameNumber: gameData.gameNumber,
        },
      },
      update: {},
      create: {
        ...gameData,
        boardId: sampleBoard.id,
        status: 'SCHEDULED',
      },
    });
  }

  console.log(`✅ Created ${sampleGames.length} sample games`);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });