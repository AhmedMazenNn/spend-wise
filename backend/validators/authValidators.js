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

  body("phone")
    .exists({ checkFalsy: true })
    .withMessage("Phone number is required")
    .bail()
    .isString()
    .withMessage("Phone must be a string")
    .bail()
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage("Phone must be between 10 and 20 characters")
    .bail()
    .matches(/^[+]?[\d\s\-()]+$/)
    .withMessage("Phone can only contain digits, spaces, +, -, (, )"),
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

const forgotPasswordValidator = [
  body("email")
    .exists({ checkFalsy: true })
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Valid email is required")
    .bail()
    .normalizeEmail(),
];

const resetPasswordValidator = [
  body("token")
    .exists({ checkFalsy: true })
    .withMessage("Reset token is required"),
  body("newPassword")
    .exists({ checkFalsy: true })
    .withMessage("New password is required")
    .bail()
    .isString()
    .withMessage("New password must be a string")
    .bail()
    .isLength({ min: 8, max: 72 })
    .withMessage("New password must be between 8 and 72 characters")
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
    .withMessage(
      "Password must include uppercase, lowercase, number, and special character"
    )
    .bail()
    .custom((value) => {
      if (value.trim() !== value) throw new Error("Password cannot start or end with spaces");
      return true;
    }),
  body("confirmPassword")
    .exists({ checkFalsy: true })
    .withMessage("Confirm password is required")
    .bail()
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage("Passwords do not match"),
];

const changePasswordValidator = [
  body("currentPassword")
    .exists({ checkFalsy: true })
    .withMessage("Current password is required")
    .bail()
    .isString()
    .withMessage("Current password must be a string"),
  body("newPassword")
    .exists({ checkFalsy: true })
    .withMessage("New password is required")
    .bail()
    .isString()
    .withMessage("New password must be a string")
    .bail()
    .isLength({ min: 8, max: 72 })
    .withMessage("New password must be between 8 and 72 characters")
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
    .withMessage(
      "New password must include uppercase, lowercase, number, and special character"
    )
    .bail()
    .custom((value) => {
      if (value.trim() !== value) throw new Error("Password cannot start or end with spaces");
      return true;
    }),
  body("confirmNewPassword")
    .exists({ checkFalsy: true })
    .withMessage("Confirm new password is required")
    .bail()
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage("New passwords do not match"),
];

module.exports = {
  signupValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
};