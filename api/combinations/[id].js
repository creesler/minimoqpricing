const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://minimoqpack.com");
  res.setHeader("Access-Control-Allow-Methods", "PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;

  const body =
    typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

  const price = Number(body.price);

  if (!id || Number.isNaN(price)) {
    return res.status(400).json({ error: "Invalid id or price" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { data, error } = await supabase
      .from("pricing_combinations")
      .update({ price })
      .eq("id", id)
      .select("id, group_name, options, price")
      .single();

    if (error) throw error;

    return res.status(200).json({
      _id: String(data.id),
      group: data.group_name,
      options: data.options,
      price: data.price
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to update combination price",
      details: err.message
    });
  }
};
