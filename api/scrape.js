module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://minimoqpack.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return res.status(200).json({
    success: true,
    message: "Main pricing scrape skipped. Using existing saved pricing combinations.",
    url: req.query.url || null
  });
};
