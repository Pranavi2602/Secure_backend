import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

// ---------------- TOKEN GENERATOR ----------------
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// ---------------- ADMIN CREDENTIAL CHECK ----------------
const checkAdminCredentials = (username, password) => {
  const adminCreds = process.env.ADMIN_CREDENTIALS || "";
  const pairs = adminCreds.split(",").map(p => p.trim());

  return pairs.some(pair => {
    const [user, pass] = pair.split(":");
    return user === username && pass === password;
  });
};

// ---------------- LOGIN (USER / ADMIN AUTO-DETECT) ----------------
export const login = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // ========== ADMIN LOGIN ==========
    if (username && password) {
      const isValidAdmin = checkAdminCredentials(username, password);

      if (!isValidAdmin) {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }

      // find or create admin model entry
      let adminEmail = `admin-${username}@system.local`;

      let adminUser = await User.findOne({ email: adminEmail, role: "admin" });

      if (!adminUser) {
        adminUser = await User.create({
          name: `Admin ${username}`,
          companyName: "System Admin",
          phone: `admin-${username}`, // Unique phone per admin user
          email: adminEmail,
          passwordHash: password, // hashed in pre-save hook
          address: "System",
          location: { lat: 0, lng: 0 },
          role: "admin",
        });
      }

      const token = generateToken(adminUser._id);

      return res.json({
        token,
        user: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
        },
      });
    }

    // ========== USER LOGIN ==========
    if (!email || !password)
      return res.status(400).json({ message: "Email & password required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(401).json({ message: "Email not registered" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid password" });

    const token = generateToken(user._id);

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
      },
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- REGISTER ----------------
export const register = async (req, res) => {
  try {
    const { name, companyName, phone, email, password, address, lat, lng } = req.body;

    if (!name || !companyName || !phone || !email || !password || !address) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail)
      return res.status(400).json({ message: "User already exists with this email" });

    const existingPhone = await User.findOne({ phone: phone.trim() });
    if (existingPhone)
      return res.status(400).json({ message: "User already exists with this phone number" });

    const location =
      lat && lng
        ? { lat: parseFloat(lat), lng: parseFloat(lng) }
        : { lat: 0, lng: 0 };

    const user = await User.create({
      name,
      companyName,
      phone,
      email: email.toLowerCase(),
      passwordHash: password,
      address,
      location,
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
      },
    });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- GET ME ----------------
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-passwordHash");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- UPDATE PROFILE ----------------
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, companyName, address, location } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update allowed fields (email cannot be changed)
    if (name) user.name = name;
    if (phone) {
      // Check if phone is already taken by another user
      const existingPhone = await User.findOne({ phone: phone.trim(), _id: { $ne: userId } });
      if (existingPhone) {
        return res.status(400).json({ message: "Phone number already in use" });
      }
      user.phone = phone.trim();
    }
    if (companyName) user.companyName = companyName;
    if (address) user.address = address;
    if (location && location.lat !== undefined && location.lng !== undefined) {
      user.location = {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng)
      };
    }

    await user.save();

    const updatedUser = await User.findById(userId).select("-passwordHash");
    res.json(updatedUser);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
