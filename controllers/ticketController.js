import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import { sendNewTicketNotification, sendTicketConfirmation, sendAdminReplyNotification } from '../config/email.js';

export const createTicket = async (req, res) => {
  try {
    const { category, title, description, preferredVisitAt } = req.body;
    const userId = req.user._id;

    // Basic required fields (location will come from the user profile)
    if (!category || !title || !description) {
      return res.status(400).json({ message: 'Please provide category, title and description' });
    }

    // Get user to read saved location from registration
    const user = await User.findById(userId);
    if (!user || !user.location || user.location.lat === undefined || user.location.lng === undefined) {
      return res.status(400).json({ message: 'User location is not set. Please update your profile.' });
    }

    // Get image URLs from uploaded files (Cloudinary or local)
    // CloudinaryStorage returns the URL in file.path (or file.secure_url/file.url)
    // Local storage returns file.filename that needs to be prefixed with /uploads/
    const images = req.files ? req.files.map(file => {
      // Cloudinary: file.path contains the Cloudinary URL (https://res.cloudinary.com/...)
      if (file.path && typeof file.path === 'string' && file.path.startsWith('http')) {
        return file.path;
      }
      // Fallback: check other Cloudinary URL properties
      if (file.secure_url) {
        return file.secure_url;
      }
      if (file.url) {
        return file.url;
      }
      // Local storage: construct path from filename
      return `/uploads/${file.filename}`;
    }) : [];
    
    // Log for debugging (remove in production)
    if (req.files && req.files.length > 0) {
      console.log(`📸 Uploaded ${images.length} image(s)`);
      images.forEach((img, idx) => {
        console.log(`   Image ${idx + 1}: ${img.startsWith('http') ? '☁️ Cloudinary' : '💾 Local'}`);
      });
    }

    const ticket = await Ticket.create({
      userId,
      category,
      title,
      description,
      images,
      preferredVisitAt: preferredVisitAt || null,
      location: {
        lat: user.location.lat,
        lng: user.location.lng
      }
    });

    const populatedTicket = await Ticket.findById(ticket._id).populate('userId', 'name companyName email phone');

    // Send emails in background (non-blocking)
    setImmediate(async () => {
      try {
        await sendNewTicketNotification(populatedTicket, user);
        await sendTicketConfirmation(populatedTicket, user);
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the request if email fails
      }
    });

    res.status(201).json(populatedTicket);
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getTickets = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    let tickets;
    if (role === 'admin') {
      // Admin sees all tickets
      tickets = await Ticket.find()
        .populate('userId', 'name companyName email phone address location')
        .sort({ createdAt: -1 });
    } else {
      // User sees only their tickets
      tickets = await Ticket.find({ userId })
        .populate('userId', 'name companyName email phone')
        .sort({ createdAt: -1 });
    }

    res.json(tickets);
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const role = req.user.role;

    const ticket = await Ticket.findById(id).populate('userId', 'name companyName email phone address location');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if user has access to this ticket
    if (role !== 'admin' && ticket.userId._id.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedVisitAt } = req.body;
    const role = req.user.role;

    if (role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const oldStatus = ticket.status;
    const oldVisitAt = ticket.assignedVisitAt;

    if (status) ticket.status = status;
    if (assignedVisitAt) ticket.assignedVisitAt = assignedVisitAt;

    await ticket.save();

    const updatedTicket = await Ticket.findById(id).populate('userId', 'name companyName email phone address location');

    // Send email notification if visit time was set or status changed (in background)
    if (updatedTicket.userId && (assignedVisitAt || (status && status !== oldStatus))) {
      setImmediate(async () => {
        try {
          let replyMessage = '';
          
          if (assignedVisitAt && (!oldVisitAt || new Date(assignedVisitAt).getTime() !== new Date(oldVisitAt).getTime())) {
            replyMessage += `A visit has been scheduled for your ticket.\n\n`;
          }
          
          if (status && status !== oldStatus) {
            if (status === 'Closed') {
              replyMessage += `Your ticket has been closed as the service is completed.\n\n`;
              replyMessage += `Thank you for using our service. If you have any further issues, please create a new ticket.\n\n`;
            } else {
              replyMessage += `Your ticket status has been updated to: ${status}.\n\n`;
            }
          }
          
          if (replyMessage) {
            if (status !== 'Closed') {
              replyMessage += `Please check your dashboard for more details.`;
            }
            await sendAdminReplyNotification(updatedTicket, updatedTicket.userId, replyMessage, assignedVisitAt || null, status === 'Closed');
          }
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          // Don't fail the request if email fails
        }
      });
    }

    res.json(updatedTicket);
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const userId = req.user._id;
    const role = req.user.role;

    if (!note) {
      return res.status(400).json({ message: 'Please provide a note' });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if user has access to this ticket
    if (role !== 'admin' && ticket.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const userName = req.user.name;
    ticket.timeline.push({
      note,
      addedBy: userName,
      seenBy: []
    });

    await ticket.save();

    const updatedTicket = await Ticket.findById(id).populate('userId', 'name companyName email phone address location');

    // Send email notification if admin added a comment (in background)
    if (role === 'admin' && updatedTicket.userId) {
      setImmediate(async () => {
        try {
          // Use the ticket's assignedVisitAt if available
          await sendAdminReplyNotification(updatedTicket, updatedTicket.userId, note, updatedTicket.assignedVisitAt || null);
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          // Don't fail the request if email fails
        }
      });
    }

    res.json(updatedTicket);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark admin reply as seen
export const markReplyAsSeen = async (req, res) => {
  try {
    const { ticketId, timelineIndex } = req.params;
    const userId = req.user._id;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if user has access to this ticket
    if (ticket.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const timelineItem = ticket.timeline[timelineIndex];
    if (!timelineItem) {
      return res.status(404).json({ message: 'Timeline item not found' });
    }

    // Check if already seen
    if (!timelineItem.seenBy) {
      timelineItem.seenBy = [];
    }

    if (!timelineItem.seenBy.includes(userId)) {
      timelineItem.seenBy.push(userId);
      await ticket.save();
    }

    const updatedTicket = await Ticket.findById(ticketId).populate('userId', 'name companyName email phone');
    res.json(updatedTicket);
  } catch (error) {
    console.error('Mark reply as seen error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



