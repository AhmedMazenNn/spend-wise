const router = require("express").Router();
const auth = require("../middlewares/auth");
const requireAdmin = require("../middlewares/requireAdmin");
const { getAllUsers } = require("../controllers/userController");

router.get("/", auth, requireAdmin, getAllUsers);

module.exports = router;