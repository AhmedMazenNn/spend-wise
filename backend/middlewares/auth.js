const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ message: "Missing or invalid Authorization header" });
    }

    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(payload.sub).select("_id name email phone role tokenVersion isVerified picture");
    if (!user) return res.status(401).json({ message: "User not found" });

    if (user.tokenVersion !== payload.tv) {
        return res.status(401).json({ message: "Token has been revoked" });
      }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
};