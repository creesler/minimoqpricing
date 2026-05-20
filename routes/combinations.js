const express = require("express");
const cors = require("cors");

const combinationRoutes = require("./routes/combinations");

const app = express();

app.use(cors({
  origin: [
    "https://minimoqpack.com",
    "https://www.minimoqpack.com",
    "http://localhost:3000"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept"]
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Minimoq pricing API is running"
  });
});

app.use("/api/combinations", combinationRoutes);

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
