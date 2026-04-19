const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const questions = [
    {
      id: 1,
      questionTitle: "What is the capital of Finland?",
      answer: "Helsinki",
      keywords: ["http", "web"]
    },
    {
      id: 2,
      questionTitle: "What is 7+4?",
      answer: "11",
      keywords: ["http", "api"]
    },
    {
      id: 3,
      questionTitle: "How many days are in a year?",
      answer: "365",
      keywords: ["javascript", "backend"]
    },
    {
      id: 4,
      questionTitle: "When is Finnish independence day?",
      answer: "6.12.",
      keywords: ["database", "backend"]
    }
  ];

async function main() {
  await prisma.question.deleteMany();
  await prisma.keyword.deleteMany();

  for (const question of questions) {
    await prisma.question.create({
      data: {
        questionTitle: question.questionTitle,
        answer: question.answer,
        keywords: {
          connectOrCreate: question.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

