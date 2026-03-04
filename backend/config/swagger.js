const path = require("path");
const swaggerJSDoc = require("swagger-jsdoc");

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Spend Wise API",
      version: "1.0.0",
      description: "API documentation for Spend Wise backend",
    },
    servers: [{ url: "http://localhost:8000", description: "Local server" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },

  // IMPORTANT: absolute paths (because this file is in /config)
  apis: [
    path.join(__dirname, "../server.js"),
    path.join(__dirname, "../routes/**/*.js"),
  ],
});

module.exports = swaggerSpec;