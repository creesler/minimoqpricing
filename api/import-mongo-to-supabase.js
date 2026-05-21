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

    const mongoRows = await db.collection("combinations").find({}).toArray();

    const rows = mongoRows
      .filter((row) => row.group && Array.isArray(row.options))
      .map((row) => ({
        group_name: row.group,
        options: row.options,
        price: Number(row.price || 0)
      }));

    if (rows.length === 0) {
      return res.status(400).json({
        error: "No valid rows found in MongoDB combinations collection"
      });
    }

    const { error: deleteError } = await supabase
      .from("pricing_combinations")
      .delete()
      .gte("id", 0);

    if (deleteError) {
      throw deleteError;
    }

    const chunkSize = 500;
    let inserted = 0;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);

      const { error } = await supabase
        .from("pricing_combinations")
        .insert(chunk);

      if (error) {
        throw error;
      }

      inserted += chunk.length;
    }

    return res.status(200).json({
      success: true,
      mongo_collection: "combinations",
      imported_rows: inserted
    });
  } catch (err) {
    console.error("Import failed:", err);

    return res.status(500).json({
      error: "Import failed",
      details: err.message
    });
  } finally {
    await mongo.close();
  }
};
