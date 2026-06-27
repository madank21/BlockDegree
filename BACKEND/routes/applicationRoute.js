// routes/application.routes.js
const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/authMiddleware");
const supabase = require("../database/supabase");
const { createDegree } = require("../services/degreeService");
// Optional: if you have a validation library like Joi, use it.

// ─── Validation helper ──────────────────────────────────────────────────────────
const validateApplication = (data) => {
  const { degree_title, field_of_study, graduation_date, gpa, honors } = data;
  if (!degree_title || typeof degree_title !== "string")
    throw new Error("degree_title is required and must be a string");
  if (!field_of_study || typeof field_of_study !== "string")
    throw new Error("field_of_study is required and must be a string");
  if (!graduation_date || isNaN(Date.parse(graduation_date)))
    throw new Error("graduation_date must be a valid date");
  if (gpa === undefined || isNaN(gpa) || gpa < 0 || gpa > 4.0)
    throw new Error("gpa must be a number between 0 and 4.0");
  // honors is optional boolean
  return true;
};

// ─── Routes ──────────────────────────────────────────────────────────────────────

// POST /api/applications – student submits application
router.post(
  "/",
  authenticate,
  requireRole(["student", "admin", "university"]), // allow admin/university for testing
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { degree_title, field_of_study, graduation_date, gpa, honors = false } = req.body;

      validateApplication({ degree_title, field_of_study, graduation_date, gpa, honors });

      const { data, error } = await supabase
        .from("applications")
        .insert([
          {
            student_id: userId,
            degree_title,
            field_of_study,
            graduation_date,
            gpa,
            honors,
            status: "pending",
            created_at: new Date(),
            updated_at: new Date(),
          },
        ])
        .select("id, status, created_at");

      if (error) throw new Error(error.message);

      res.status(201).json({
        success: true,
        applicationId: data[0].id,
        status: data[0].status,
        createdAt: data[0].created_at,
        message: "Application submitted successfully. Awaiting review.",
      });
    } catch (error) {
      console.error("Error creating application:", error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// GET /api/applications – list all (admin/university only)
router.get(
  "/",
  authenticate,
  requireRole(["admin", "university"]),
  async (req, res) => {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      let query = supabase
        .from("applications")
        .select("*, student:users(id, email, full_name)", { count: "exact" });

      if (status) {
        query = query.eq("status", status);
      }

      query = query.range(offset, offset + limit - 1).order("created_at", { ascending: false });

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      res.json({
        success: true,
        data,
        pagination: { page: parseInt(page), limit: parseInt(limit), total: count },
      });
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// GET /api/applications/:id – get one (admin/university/owner student)
router.get(
  "/:id",
  authenticate,
  requireRole(["admin", "university", "student"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      let query = supabase
        .from("applications")
        .select("*, student:users(id, email, full_name)")
        .eq("id", id)
        .single();

      // If student, only allow if they own it
      if (userRole === "student") {
        query = query.eq("student_id", userId);
      }

      const { data, error } = await query;
      if (error) {
        if (error.code === "PGRST116") {
          return res.status(404).json({ success: false, message: "Application not found or access denied" });
        }
        throw new Error(error.message);
      }

      res.json({ success: true, data });
    } catch (error) {
      console.error("Error fetching application:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// PATCH /api/applications/:id/status – approve/reject (admin/university only)
router.patch(
  "/:id/status",
  authenticate,
  requireRole(["admin", "university"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, admin_notes } = req.body;

      if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
      }

      // Fetch application
      const { data: app, error: fetchError } = await supabase
        .from("applications")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !app) {
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      if (app.status !== "pending") {
        return res.status(400).json({ success: false, message: "Application already processed" });
      }

      const updates = {
        status,
        admin_notes: admin_notes || null,
        updated_at: new Date(),
      };

      let degreeResult = null;

      if (status === "approved") {
        // Create degree using application data
        degreeResult = await createDegree({
          student_id: app.student_id,
          degree_title: app.degree_title,
          field_of_study: app.field_of_study,
          graduation_date: app.graduation_date,
          gpa: app.gpa,
          honors: app.honors,
          issued_by: req.user.id,
          issued_at: new Date(),
        });

        if (!degreeResult.success) {
          throw new Error(degreeResult.message || "Failed to issue degree");
        }
        updates.degree_id = degreeResult.degree.id;
      }

      // Update application
      const { data: updatedApp, error: updateError } = await supabase
        .from("applications")
        .update(updates)
        .eq("id", id)
        .select("*");

      if (updateError) throw new Error(updateError.message);

      res.json({
        success: true,
        application: updatedApp[0],
        degree: degreeResult ? degreeResult.degree : null,
        message: status === "approved" ? "Application approved and degree issued" : "Application rejected",
      });
    } catch (error) {
      console.error("Error updating application status:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// DELETE /api/applications/:id – delete pending (admin/university only)
router.delete(
  "/:id",
  authenticate,
  requireRole(["admin", "university"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data: app, error: fetchError } = await supabase
        .from("applications")
        .select("status")
        .eq("id", id)
        .single();

      if (fetchError || !app) {
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      if (app.status !== "pending") {
        return res.status(400).json({ success: false, message: "Cannot delete a processed application" });
      }

      const { error } = await supabase.from("applications").delete().eq("id", id);
      if (error) throw new Error(error.message);

      res.json({ success: true, message: "Application deleted successfully" });
    } catch (error) {
      console.error("Error deleting application:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;