const User = require("../models/User");

async function getAllUsers(req, res, next) {
  try {
    const users = await User.find().select("_id name email role createdAt");
    return res.status(200).json({ count: users.length, users });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllUsers };