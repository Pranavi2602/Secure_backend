import express from 'express';
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  addComment,
  markReplyAsSeen
} from '../controllers/ticketController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create ticket (with image upload support - max 5 images)
router.post('/', upload.array('images', 5), createTicket);

// Get all tickets (admin sees all, user sees their own)
router.get('/', getTickets);

// Get single ticket
router.get('/:id', getTicketById);

// Update ticket (admin only)
router.put('/:id', adminOnly, updateTicket);

// Add comment to ticket
router.post('/:id/comments', addComment);

// Mark admin reply as seen
router.put('/:ticketId/replies/:timelineIndex/seen', markReplyAsSeen);

export default router;




