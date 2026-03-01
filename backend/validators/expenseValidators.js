const { body } = require("express-validator");

const createExpenseValidator = [
  body("amount")
    .exists({ checkFalsy: true })
    .withMessage("Amount is required")
    .bail()
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number"),

  body("categoryId")
    .exists({ checkFalsy: true })
    .withMessage("Category is required")
    .bail()
    .isMongoId()
    .withMessage("Invalid category ID"),

  body("title")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Title must be at most 200 characters"),

  body("note")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Note must be at most 500 characters"),

  body("date")
    .optional()
    .isISO8601()
    .withMessage("Date must be a valid ISO date"),
];

module.exports = { createExpenseValidator };
