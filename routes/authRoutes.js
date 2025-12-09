import express from "express";
import { login, register, getMe, updateProfile } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// LOGIN (handles both admin & user)
router.post("/login", login);

// USER REGISTER
router.post("/register", register);

// PROFILE
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);

export default router;
