const bcrypt = require("bcrypt");
const User = require("../models/User");

async function getAllUsers(req, res, next) {
  try {
    const raw = await User.find().select("_id name email phone role createdAt").lean();
    const users = raw.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
    }));
    return res.status(200).json({ count: users.length, users });
  } catch (err) {
    next(err);
  }
}

/** User updates own profile (name, email, phone). Password changed via /auth/change-password. */
async function updateMe(req, res, next) {
  try {
    const { name, email, phone } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) {
      const existing = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (existing) {
        const err = new Error("Email already in use");
        err.statusCode = 409;
        throw err;
      }
      updates.email = email;
    }
    if (phone !== undefined) updates.phone = phone;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "At least one of name, email, or phone is required" });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { returnDocument: "after", runValidators: true }
    ).select("_id name email phone role createdAt");
    return res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

/** Admin updates any user by id (name, email, role, phone, password). At least one field required. */
async function updateUserByAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, role, phone, password } = req.body;
    const target = await User.findById(id);
    if (!target) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) {
      const existing = await User.findOne({ email, _id: { $ne: id } });
      if (existing) {
        const err = new Error("Email already in use");
        err.statusCode = 409;
        throw err;
      }
      updates.email = email;
    }
    if (role !== undefined) updates.role = role;
    if (phone !== undefined) updates.phone = phone;
    if (password) {
      updates.passwordHash = await bcrypt.hash(password, 12);
      updates.tokenVersion = (target.tokenVersion || 0) + 1;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "At least one of name, email, role, phone, or password is required" });
    }
    const user = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { returnDocument: "after", runValidators: true }
    ).select("_id name email phone role createdAt");
    return res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

/** User deletes own account. */
async function deleteMe(req, res, next) {
  try {
    await User.findByIdAndDelete(req.user._id);
    return res.status(200).json({ message: "Account deleted" });
  } catch (err) {
    next(err);
  }
}

/** Admin deletes any user by id. */
async function deleteUserByAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }
    return res.status(200).json({ message: "User deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllUsers, updateMe, updateUserByAdmin, deleteMe, deleteUserByAdmin };