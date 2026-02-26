const { body } = require("express-validator");

const NAME_REGEX = /^[\p{L}]+(?:[ '\-][\p{L}]+)*$/u;

const passwordOptional = [
  body("password")
    .optional()
    .isString()
    .withMessage("Password must be a string")
    .bail()
    .isLength({ min: 8, max: 72 })
    .withMessage("Password must be between 8 and 72 characters")
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
    .withMessage(
      "Password must include uppercase, lowercase, number, and special character"
    )
    .bail()
    .custom((value) => {
      if (value && value.trim() !== value) throw new Error("Password cannot start or end with spaces");
      return true;
    }),
  body("confirmPassword")
    .optional()
    .custom((value, { req }) => !req.body.password || value === req.body.password)
    .withMessage("Passwords do not match"),
];

const PHONE_REGEX = /^[+]?[\d\s\-()]+$/;

/** User can update own profile: name, email, and/or phone (no password here; use change-password) */
const updateMeValidator = [
  body("name")
    .optional()
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
    .optional()
    .isEmail()
    .withMessage("Valid email is required")
    .bail()
    .normalizeEmail(),
  body("phone")
    .optional()
    .isString()
    .withMessage("Phone must be a string")
    .bail()
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage("Phone must be between 10 and 20 characters")
    .bail()
    .matches(PHONE_REGEX)
    .withMessage("Phone can only contain digits, spaces, +, -, (, )"),
  body().custom((value, { req }) => {
    const { name, email, phone } = req.body;
    if (!name && !email && !phone) {
      throw new Error("At least one of name, email, or phone is required");
    }
    return true;
  }),
];

/** Admin can update any user: name, email, role, and/or password (all optional but at least one) */
const updateUserByAdminValidator = [
  body("name")
    .optional()
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
    .optional()
    .isEmail()
    .withMessage("Valid email is required")
    .bail()
    .normalizeEmail(),
  body("role")
    .optional()
    .isIn(["user", "admin"])
    .withMessage("Role must be user or admin"),
  body("phone")
    .optional()
    .isString()
    .withMessage("Phone must be a string")
    .bail()
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage("Phone must be between 10 and 20 characters")
    .bail()
    .matches(PHONE_REGEX)
    .withMessage("Phone can only contain digits, spaces, +, -, (, )"),
  ...passwordOptional,
  body().custom((value, { req }) => {
    const { name, email, role, password, phone } = req.body;
    if (!name && !email && role === undefined && !password && !phone) {
      throw new Error("At least one of name, email, role, phone, or password is required");
    }
    return true;
  }),
];

module.exports = { updateMeValidator, updateUserByAdminValidator };
