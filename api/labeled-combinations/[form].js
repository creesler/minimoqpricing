const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://minimoqpack.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Missing Supabase environment variables" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const key = req.query.form;

  if (!key) {
    return res.status(400).json({ error: "Missing key" });
  }

  // Public/product/admin table read:
  // GET /api/labeled-combinations/form_cardstock
  if (req.method === "GET") {
    try {
      const { data, error } = await supabase
        .from("labeled_combinations")
        .select("fields, combinations")
        .eq("form_key", key)
        .single();

      if (error) throw error;

      return res.status(200).json({
        fields: data.fields,
        combinations: data.combinations
      });
    } catch (err) {
      return res.status(404).json({
        error: "Labeled combinations not found",
        form: key
      });
    }
  }

  // Admin price save:
  // PUT /api/labeled-combinations/COMBINATION_ID
  if (req.method === "PUT") {
    try {
      const { price } = req.body;

      if (price === undefined || isNaN(Number(price))) {
        return res.status(400).json({ error: "Invalid price" });
      }

      const { data: forms, error: fetchError } = await supabase
        .from("labeled_combinations")
        .select("id, form_key, combinations");

      if (fetchError) throw fetchError;

      let targetForm = null;
      let updatedCombinations = null;
      let updatedCombination = null;

      for (const form of forms) {
        const combinations = Array.isArray(form.combinations) ? form.combinations : [];
        const index = combinations.findIndex((combo) => combo._id === key);

        if (index !== -1) {
          updatedCombinations = combinations.map((combo) => {
            if (combo._id === key) {
              updatedCombination = {
                ...combo,
                price: Number(price)
              };
              return updatedCombination;
            }
            return combo;
          });

          targetForm = form;
          break;
        }
      }

      if (!targetForm) {
        return res.status(404).json({
          error: "Combination ID not found",
          id: key
        });
      }

      const { error: updateError } = await supabase
        .from("labeled_combinations")
        .update({ combinations: updatedCombinations })
        .eq("id", targetForm.id);

      if (updateError) throw updateError;

      return res.status(200).json(updatedCombination);
    } catch (err) {
      return res.status(500).json({
        error: "Failed to update price",
        details: err.message
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
