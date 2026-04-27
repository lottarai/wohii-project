const express = require('express');
const router = express.Router();
const prisma = require("../lib/prisma")
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");

function formatQuestion(question) {
  return {
    ...question,
    keywords: question.keywords.map((k) => k.name),
  };
}


router.use(authenticate);


// GET /api/questions/,/api/questions?keyword=http
router.get("/", async (req, res) => {
    const {keyword} = req.query;

    const where = keyword ?
    { keywords: { some: { name: keyword } } } : {};

    const filteredQuestions = await prisma.question.findMany({
        where,
        include: {keywords: true},
        orderBy: {id: "asc"}
    });

    res.json(filteredQuestions.map(formatQuestion))
})

// GET /api/questions/:questionId
router.get("/:questionId", async (req, res) => {
    const questionId = Number(req.params.questionId);
    const question = await prisma.question.findUnique({
        where: { id: questionId},
        include: { keywords: true},
    });
    
    if (!question) {
        return res.status(404).json({msg: "Question not found"});
    }
    res.json(formatQuestion(question));
});

// POST /api/questions
router.post("/", async (req, res) => {
    const {questionTitle, answer, keywords} = req.body;
    if (!questionTitle || !answer) {
        return res.status(400).json({msg: "question and answer are required"})
    }

    //const existingIds = questions.map(p=>p.id) // [1,2,3,4]
    const keywordsArray = Array.isArray(keywords) ? keywords : [];

    const newQuestion = await prisma.question.create({
        data: {
            questionTitle, answer,
            keywords: {
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: { name: kw}, create: { name: kw},
                })),},
        },
        include: { keywords: true},
    });

    res.status(201).json(formatQuestion(newQuestion));
});

// PUT /api/questions/:questionId
router.put("/:questionId", isOwner, async (req, res) => {
    const questionId = Number(req.params.questionId);
    const {questionTitle, answer, keywords} = req.body;

    const question = await prisma.question.findUnique({ where: { id: questionId}});
    
    if (!question) {
        return res.status(404).json({msg: "Question not found"});
    }

    if (!questionTitle || !answer) {
        return res.status(400).json({msg: "question and answer are required"})
    }

    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    const updatedQuestion = await prisma.question.update({
        where: { id: questionId },
        data: {
            questionTitle, answer,
            keywords: {
                set: [],
            connectOrCreate: keywordsArray.map((kw) => ({
                where: { name: kw },
                create: { name: kw },
            })),
        },
        },
        include: { keywords: true },
    });
  res.json(formatQuestion(updatedQuestion));
});


// DELETE /api/questions/:questionId
router.delete("/:questionId", isOwner, async (req, res) => {
    const questionId = Number(req.params.questionId);
    const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { keywords: true },
    });

    if (!question) {
        return res.status(404).json({ message: "Question not found" });
    }

    await prisma.question.delete({ where: { id: questionId } });

    res.json({
        message: "Question deleted successfully",
        post: formatQuestion(question),
    });

});


module.exports = router;

