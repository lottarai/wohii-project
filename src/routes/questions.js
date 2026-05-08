const express = require('express');
const router = express.Router();
const prisma = require("../lib/prisma")
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: path.join(__dirname, "..","..","public","uploads"),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const newName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
        cb(null, newName)
    }
})

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image")) {
            cb(null, true)
        } else {
            cb(new Error("Only images allowed"))
        }
    },
    limits: {fileSize: 5 * 1024 * 1024}
})

function formatQuestion(question) {
  return {
    ...question,
    keywords: question.keywords.map((k) => k.name),
    userName: question.user ? question.user.name : null,
    solved: question.attempts && question.attempts.some(a => a.correct),
    user: undefined,
    _count: undefined,
    attempts: undefined
  };
}


router.use(authenticate);


// GET /api/questions/,/api/questions?keyword=http&page=1&limit=5
router.get("/", async (req, res) => {
    const {keyword} = req.query;

    const where = keyword ?
    { keywords: { some: { name: keyword } } } : {};

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
    const skip = (page-1) * limit;

    const [filteredQuestions, total] = await Promise.all([prisma.question.findMany({
        where,
        include: {
            keywords: true,
            user: true,
            attempts: {where: {userId: req.user.userId}}
        },
        orderBy: {id: "asc"},
        skip,
        take: limit
    }), prisma.question.count({where})]);

    res.json({
        data: filteredQuestions.map(formatQuestion),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    })
});

// GET /api/questions/:questionId
router.get("/:questionId", async (req, res) => {
    const questionId = Number(req.params.questionId);
    const question = await prisma.question.findUnique({
        where: { id: questionId},
        include: {
            keywords: true,
            user: true,
            attempts: {where: {userId: req.user.userId}}}
    });
    
    if (!question) {
        return res.status(404).json({msg: "Question not found"});
    }
    res.json(formatQuestion(question));
});

// POST /api/questions
router.post("/", upload.single("image"), async (req, res) => {
    const {questionTitle, answer, keywords} = req.body;
    if (!questionTitle || !answer) {
        return res.status(400).json({msg: "question and answer are required"})
    }

    //const existingIds = questions.map(p=>p.id) // [1,2,3,4]
    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    const imageUrl = req.file ? `/uploads/${req.file.filename}`:null;

    const newQuestion = await prisma.question.create({
        data: {
            questionTitle, answer, imageUrl,
            user: { connect: { id: req.user.userId } },
            keywords: {
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: { name: kw}, create: { name: kw},
                })),},
        },
        include: {
            keywords: true,
            user: true,
            attempts: true
        },
    });

    res.status(201).json(formatQuestion(newQuestion));
});

// PUT /api/questions/:questionId
router.put("/:questionId", isOwner, upload.single("image"), async (req, res) => {
    const questionId = Number(req.params.questionId);
    const {questionTitle, answer, keywords} = req.body;

    const question = await prisma.question.findUnique({ where: { id: questionId}});
    
    if (!question) {
        return res.status(404).json({msg: "Question not found"});
    }

    if (!questionTitle || !answer) {
        return res.status(400).json({msg: "question and answer are required"})
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}`:null;
    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    const updatedQuestion = await prisma.question.update({
        where: { id: questionId },
        data: {
            questionTitle, answer, imageUrl,
            keywords: {
                set: [],
            connectOrCreate: keywordsArray.map((kw) => ({
                where: { name: kw },
                create: { name: kw },
            })),
        },
        },
        include: {
            keywords: true,
            user: true,
            attempts: true
        },
    });
  res.json(formatQuestion(updatedQuestion));
});


// DELETE /api/questions/:questionId
router.delete("/:questionId", isOwner, async (req, res) => {
    const questionId = Number(req.params.questionId);
    const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: {
            keywords: true,
            user: true,
            attempts: {where: {userId: req.user.userId}, take: 1},
            _count: {select: {attempts: true}}
}});

    if (!question) {
        return res.status(404).json({ message: "Question not found" });
    }

    await prisma.question.delete({ where: { id: questionId } });

    res.json({
        message: "Question deleted successfully",
        question: formatQuestion(question),
    });

});


// POST /api/questions/:questionId/play
router.post("/:questionId/play", async (req, res) => {
    const questionId = Number(req.params.questionId);
    const { answer } = req.body;

    const question = await prisma.question.findUnique({where: {id: questionId}});
    if(!question) {
        return res.status(404).json({ message: "Question not found"})
    }

    const correct = answer.trim().toLowerCase() === question.answer.trim().toLowerCase();
    const attempt = await prisma.attempt.upsert({
        where: {
            userId_questionId: {
                userId: req.user.userId,
                questionId
            }
        },
        update: {
            answer,
            correct
        },
        create: {
            answer,
            correct,
            userId: req.user.userId,
            questionId
        }
    })

    res.status(201).json({
    id: attempt.id,
        questionId,
        correct,
        correctAnswer: question.answer
    })
});


module.exports = router;

