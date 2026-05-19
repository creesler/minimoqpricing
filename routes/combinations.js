const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("Missing Supabase environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("pricing_combinations")
      .select("group_name, options, price")
      .order("id", { ascending: true });

    if (error) {
      throw error;
    }

    const combinations = data.map((row) => ({
      group: row.group_name,
      options: row.options,
      price: row.price
    }));

    res.json(combinations);
  } catch (err) {
    console.error("Failed to load combinations:", err);

    res.status(500).json({
      error: "Failed to load pricing combinations"
    });
  }
});

module.exports = router;
