const { body } = require("express-validator");

// Allow letters (any language), spaces, apostrophes, and hyphens.
// Disallow digits and other symbols.
const NAME_REGEX = /^[\p{L}]+(?:[ '\-][\p{L}]+)*$/u;

const signupValidator = [
  body("name")
    .exists({ checkFalsy: true })
    .withMessage("Name is required")
    .bail()
    .isString()
    .withMessage("Name must be a string")
    .bail()
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage("Name must be between 2 and 60 characters")
    .bail()
    .matches(NAME_REGEX)
    .withMessage("Name can contain letters, spaces, hyphens, and apostrophes only"),

  body("email")
    .exists({ checkFalsy: true })
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Valid email is required")
    .bail()
    .normalizeEmail(),

  body("password")
    .exists({ checkFalsy: true })
    .withMessage("Password is required")
    .bail()
    .isString()
    .withMessage("Password must be a string")
    .bail()
    .isLength({ min: 8, max: 72 })
    .withMessage("Password must be between 8 and 72 characters")
    .bail()
    // at least 1 lowercase, 1 uppercase, 1 number, 1 special char
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
    .withMessage(
      "Password must include uppercase, lowercase, number, and special character"
    )
    .bail()
    // avoid leading/trailing spaces (common mistake)
    .custom((value) => {
      if (value.trim() !== value) throw new Error("Password cannot start or end with spaces");
      return true;
    }),

  body("confirmPassword")
    .exists({ checkFalsy: true })
    .withMessage("Confirm password is required")
    .bail()
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords do not match"),
];

const loginValidator = [
  body("email")
    .exists({ checkFalsy: true })
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Valid email is required")
    .bail()
    .normalizeEmail(),

  body("password")
    .exists({ checkFalsy: true })
    .withMessage("Password is required")
    .bail()
    .isString()
    .withMessage("Password must be a string")
    .bail()
    .isLength({ min: 1 })
    .withMessage("Password is required"),
];

module.exports = { signupValidator, loginValidator };