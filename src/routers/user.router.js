import express from "express";
import { register , getMe, refreshToken , logout, logoutAll, login} from "../controllers/user.controller.js";

const authRouter = express.Router();

authRouter.post("/register", register)
authRouter.post("/login", login)
authRouter.post("/refresh-token", refreshToken)
authRouter.post("/logout", logout)
authRouter.post('/logoutAll', logoutAll)

authRouter.get("/get", getMe)

export default authRouter