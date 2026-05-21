const { MongoClient } = require("mongodb");
const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  if (!process.env.MONGO_URI) {
    return res.status(500).json({ error: "Missing MONGO_URI" });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Missing Supabase environment variables" });
  }

  const mongo = new MongoClient(process.env.MONGO_URI);

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    await mongo.connect();

    const db = mongo.db("test");
    const mongoRows = await db.collection("labeledcombinations").find({}).toArray();

    const rows = mongoRows
      .map((row) => ({
        form_key:
          row.formId ||
          row.formID ||
          row.form_key ||
          row.formKey ||
          row.form ||
          row.label ||
          row.name ||
          row.title,
        fields: row.fields || [],
        combinations: row.combinations || []
      }))
      .filter((row) => row.form_key && Array.isArray(row.fields) && Array.isArray(row.combinations));

    if (!rows.length) {
      return res.status(400).json({
        error: "No valid labeled rows found",
        sample: mongoRows.slice(0, 3)
      });
    }

    await supabase.from("labeled_combinations").delete().neq("form_key", "");

    const { error } = await supabase
      .from("labeled_combinations")
      .insert(rows);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      imported_rows: rows.length,
      forms: rows.map((row) => row.form_key)
    });
  } catch (err) {
    return res.status(500).json({
      error: "Import failed",
      details: err.message
    });
  } finally {
    await mongo.close();
  }
};
