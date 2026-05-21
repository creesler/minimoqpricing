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

  const { form } = req.query;

  if (!form) {
    return res.status(400).json({ error: "Missing form key" });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Missing Supabase environment variables" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { data, error } = await supabase
      .from("labeled_combinations")
      .select("fields, combinations")
      .eq("form_key", form)
      .single();

    if (error) throw error;

    return res.status(200).json({
      fields: data.fields,
      combinations: data.combinations
    });
  } catch (err) {
    return res.status(404).json({
      error: "Labeled combinations not found",
      form
    });
  }
};
