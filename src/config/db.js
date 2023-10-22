const mongoose = require("mongoose");
const connect = async () => {
  mongoose.set("strictQuery", false);
  return mongoose.connect(process.env.DB_URL,{
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
};
module.exports = connect;