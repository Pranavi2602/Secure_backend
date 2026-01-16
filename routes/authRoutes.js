import express from "express";
import { login, register, getMe, updateProfile, forgotPassword, verifyResetToken, resetPassword, checkAvailability } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// LOGIN (handles both admin & user)
router.post("/login", login);

// USER REGISTER
router.post("/register", register);
router.post("/check-availability", checkAvailability);

// PASSWORD RESET
router.post("/forgot-password", forgotPassword);
router.get("/verify-reset-token/:token", verifyResetToken);
router.post("/reset-password/:token", resetPassword);

// PROFILE
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);

export default router;
