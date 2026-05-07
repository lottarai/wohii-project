const CONFIG = {
  API_URL: "",
  ROUTES: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    QUESTIONS: "/api/questions",
  },
  FIELDS: {
    LOGIN: ["email", "password"],
    REGISTER: ["email", "password", "name"],
    QUESTION: ["questionTitle", "answer", "keywords"],
  },
  QUESTIONS_PER_PAGE: 5,
  STORAGE_KEY: "jwt_token",
  API_FIELDS: {
    SOLVED: "solved",
  },
};
