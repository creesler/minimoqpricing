const { MongoClient } = require("mongodb");

module.exports = async function handler(req, res) {
  if (req.query.secret !== process.env.EXPORT_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!process.env.MONGO_URI) {
    return res.status(500).json({ error: "Missing MONGO_URI" });
  }

  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();

    const db = client.db();
    const collections = await db.listCollections().toArray();

    const output = {};

    for (const collection of collections) {
      const name = collection.name;
      output[name] = await db.collection(name).find({}).toArray();
    }

    return res.status(200).json({
      database: db.databaseName,
      collections: Object.keys(output),
      data: output
    });
  } catch (err) {
    return res.status(500).json({
      error: "Mongo export failed",
      details: err.message
    });
  } finally {
    await client.close();
  }
};
