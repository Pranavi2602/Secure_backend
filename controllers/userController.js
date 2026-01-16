import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import ServiceRequest from '../models/ServiceRequest.js';

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
  try {
    const role = req.user.role;

    if (role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const users = await User.find({})
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    // Get ticket count for each user
    const usersWithTicketCount = await Promise.all(
      users.map(async (user) => {
        const ticketCount = await Ticket.countDocuments({ userId: user._id });
        return {
          ...user.toObject(),
          ticketCount
        };
      })
    );

    res.json(usersWithTicketCount);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user by ID (admin only)
export const getUserById = async (req, res) => {
  try {
    const role = req.user.role;
    const { id } = req.params;

    if (role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const user = await User.findById(id).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user tickets count
    const ticketCount = await Ticket.countDocuments({ userId: user._id });

    res.json({
      ...user.toObject(),
      ticketCount
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete user (admin only)
export const deleteUser = async (req, res) => {
  try {
    const role = req.user.role;
    const { id } = req.params;

    if (role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't allow deleting admin users
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin users' });
    }

    // Delete all tickets associated with this user
    await Ticket.deleteMany({ userId: id });

    // Delete all service requests associated with this user
    await ServiceRequest.deleteMany({ userId: id });

    // Delete the user
    await User.findByIdAndDelete(id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
