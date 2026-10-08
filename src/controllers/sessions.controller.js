import { env } from "../config/env.js";
import { sessionsService } from "../services/sessions.service.js";
import { generateToken } from "../utils/jwt.js";

const getCookieMaxAge = (expiresIn) => {
  const match = String(expiresIn).match(/^(\d+)([smhd])$/i);
  if (!match) return 60 * 60 * 1000;

  const value = Number(match[1]);
  const units = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * units[match[2].toLowerCase()];
};

const getCookieOptions = (nodeEnv) => ({
  httpOnly: true,
  sameSite: "lax",
  maxAge: getCookieMaxAge(env.JWT_EXPIRES_IN),
  secure: nodeEnv === "production"
});

export const register = (req, res) => {
  res.status(201).json({ status: "success", payload: req.user });
};

export const login = (req, res) => {
  const user = req.user;
  const token = generateToken(user);
  res.cookie("currentUser", token, getCookieOptions(env.NODE_ENV));
  res.status(200).json({ status: "success", message: "Login correcto" });
};

export const current = (req, res) => {
  res.status(200).json({ status: "success", payload: sessionsService.current(req.user) });
};

export const logout = (req, res) => {
  res.clearCookie("currentUser", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production"
  });
  res.status(200).json({ status: "success", message: "Sesión cerrada" });
};
