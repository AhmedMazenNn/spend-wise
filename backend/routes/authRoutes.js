

const express = require("express");

const {
    registerUser,
    loginUser,
    getUserInfo
} = require("../controllers/authController");

const router = express.Router();

// Register a new user
router.post("/register", registerUser);

// Login a user
router.post("/login", loginUser);

// Get user info (protected route)
router.get("/getUser", getUserInfo);

module.exports = router;