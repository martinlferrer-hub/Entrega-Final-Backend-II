import { Router } from "express";
import passport from "../config/passport.config.js";
import { auth } from "../middlewares/auth.middleware.js";
import {
  register,
  login,
  current,
  logout
} from "../controllers/sessions.controller.js";

const router = Router();


router.post(
  "/register",
  passport.authenticate("register", { session: false }),
  register
);

router.post(
  "/login",
  passport.authenticate("login", { session: false }),
  login
);

router.get("/current", auth, current);

router.post("/logout", logout);

export default router;
