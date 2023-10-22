require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const connect = require("./config/db");
const bookRouter = require("./features/book/book.route");
const userRouter = require("./features/user/user.route");

const PORT = process.env.PORT || 8080;

// Deafult Midllewares
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Routes

app.use("/user", userRouter);
app.use("/book", bookRouter);

app.get("/", async (req, res) => {
  res.status(200).send("BASE PAGE");
});

app.listen(PORT, async () => {
  await connect();
  console.log("listen on 8080");
});