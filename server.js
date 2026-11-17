import app from "./src/app.js";
import connectDB from "./src/dataBase/db.js";

const startServer = async () => {
  try {
    connectDB();

    app.listen(500, () => {
      console.log(`server starrt successfully http://localhost:500`);
    });

  } catch (error) {
    console.log("Server startup failed:", error)
  }
};

startServer();
