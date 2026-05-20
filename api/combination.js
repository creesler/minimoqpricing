const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://minimoqpack.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: "Missing Supabase environment variables"
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

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

    return res.status(200).json(combinations);
  } catch (err) {
    console.error("Supabase error:", err);

    return res.status(500).json({
      error: "Failed to load pricing combinations",
      details: err.message
    });
  }
};
