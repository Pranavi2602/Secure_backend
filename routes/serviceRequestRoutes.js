import express from 'express';
import {
  createServiceRequest,
  getServiceRequests,
  getServiceRequestById,
  updateServiceRequest,
  addComment,
  markReplyAsSeen
} from '../controllers/serviceRequestController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create service request (with image upload support - max 5 images)
router.post('/', upload.array('images', 5), createServiceRequest);

// Get all service requests (admin sees all, user sees their own)
router.get('/', getServiceRequests);

// Get single service request
router.get('/:id', getServiceRequestById);

// Update service request (admin only)
router.put('/:id', adminOnly, updateServiceRequest);

// Add comment to service request
router.post('/:id/comments', addComment);

// Mark admin reply as seen
router.put('/:requestId/replies/:timelineIndex/seen', markReplyAsSeen);

export default router;






