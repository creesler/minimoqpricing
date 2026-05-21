const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://minimoqpack.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { data, error } = await supabase
      .from("pricing_combinations")
      .select("id, group_name, options, price")
      .order("id", { ascending: true });

    if (error) throw error;

    return res.status(200).json(
      data.map((row) => ({
        _id: String(row.id),
        group: row.group_name,
        options: row.options,
        price: row.price
      }))
    );
  } catch (err) {
    return res.status(500).json({
      error: "Failed to load combinations",
      details: err.message
    });
  }
};
