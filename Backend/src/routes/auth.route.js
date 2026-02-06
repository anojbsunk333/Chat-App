import express from "express";
import {
  checkAuth,
  login,
  logout,
  signup,
  updateProfile,
  partialUpdateProfile,
  deleteAccount,
  checkUserExists,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// POST methods - Create resources
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

// GET methods - Retrieve resources
router.get("/check", protectRoute, checkAuth);
router.head("/check-exists", checkUserExists);

// PUT method - Full profile update
router.put("/update-profile", protectRoute, updateProfile);

// PATCH method - Partial profile update
router.patch("/update-profile", protectRoute, partialUpdateProfile);

// DELETE method - Delete account
router.delete("/delete-account", protectRoute, deleteAccount);

export default router;
