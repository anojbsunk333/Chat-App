import app from "../src/index.js";

export default async (req, res) => {
  // Ensure routes are properly mounted in serverless environment
  return app(req, res);
};
