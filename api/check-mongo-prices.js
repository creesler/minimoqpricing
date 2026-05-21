const { MongoClient } = require("mongodb");

module.exports = async function handler(req, res) {
  if (!process.env.MONGO_URI) {
    return res.status(500).json({ error: "Missing MONGO_URI" });
  }

  const product = req.query.product;

  if (!product) {
    return res.status(400).json({
      error: "Missing product query. Example: ?product=form_perfectbinding"
    });
  }

  const mongo = new MongoClient(process.env.MONGO_URI);

  try {
    await mongo.connect();

    const db = mongo.db("test");

    const row = await db.collection("labeledcombinations").findOne({
      product
    });

    if (!row) {
      return res.status(404).json({
        error: "Product not found in MongoDB labeledcombinations",
        product
      });
    }

    const combinations = Array.isArray(row.combinations) ? row.combinations : [];

    const zeroPrices = combinations.filter((c) => Number(c.price || 0) === 0);
    const nonZeroPrices = combinations.filter((c) => Number(c.price || 0) !== 0);

    return res.status(200).json({
      product,
      fields: row.fields,
      total_combinations: combinations.length,
      zero_price_count: zeroPrices.length,
      non_zero_price_count: nonZeroPrices.length,
      non_zero_samples: nonZeroPrices.slice(0, 20).map((c) => ({
        _id: c._id,
        options: c.options,
        price: c.price
      })),
      zero_samples: zeroPrices.slice(0, 10).map((c) => ({
        _id: c._id,
        options: c.options,
        price: c.price
      }))
    });
  } catch (err) {
    return res.status(500).json({
      error: "Mongo price check failed",
      details: err.message
    });
  } finally {
    await mongo.close();
  }
};
