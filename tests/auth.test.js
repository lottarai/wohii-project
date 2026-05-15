
const { resetDb, request, prisma, app } = require("./helpers");
const bcrypt = require("bcrypt");

beforeEach(resetDb);

it("registers, hashes password & returns token", async () => {

    const res = await request(app).post("/api/auth/register")
    .send({email: "a@test.io", password: "pw12345", name: "A"});

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    const user = await prisma.user.findUnique({where:{email: "a@test.io"}});
    expect(user.password).not.toBe("pw12345");
    const comparison = await bcrypt.compare("pw12345", user.password);
    expect(comparison).toBe(true);
})

