import express from 'express';
import { getAllUsers, getUserById, deleteUser } from '../controllers/userController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

// Get all users
router.get('/', getAllUsers);

// Get user by ID
router.get('/:id', getUserById);

// Delete user
router.delete('/:id', deleteUser);

export default router;
