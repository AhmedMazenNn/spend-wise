const router = require("express").Router();
const {
  createIncome,
  getIncomes,
  updateIncome,
  deleteIncome,
  exportIncomes,
} = require("../controllers/incomeController");
const auth = require("../middlewares/auth");

router.post("/", auth, createIncome);
router.get("/", auth, getIncomes);
router.get("/export", auth, exportIncomes);
router.patch("/:id", auth, updateIncome);
router.delete("/:id", auth, deleteIncome);

module.exports = router;
