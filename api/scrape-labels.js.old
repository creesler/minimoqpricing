const cheerio = require("cheerio");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

function makeId(product, options) {
  return crypto
    .createHash("sha1")
    .update(product + "::" + JSON.stringify(options))
    .digest("hex")
    .slice(0, 24);
}

function cartesianProduct(arrays) {
  return arrays.reduce(
    (acc, curr) => acc.flatMap((a) => curr.map((b) => [...a, b])),
    [[]]
  );
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function getProductFromUrl(url) {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

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

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Missing Supabase environment variables" });
  }

  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  let product;

  try {
    product = getProductFromUrl(targetUrl);
  } catch {
    return res.status(400).json({ error: "Invalid url parameter" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const pageRes = await fetch(targetUrl);

    if (!pageRes.ok) {
      return res.status(500).json({
        error: "Failed to fetch form page",
        status: pageRes.status,
        url: targetUrl
      });
    }

    const html = await pageRes.text();
    const $ = cheerio.load(html);

    const fields = [];

    $("select").each((index, selectEl) => {
      const $select = $(selectEl);

      let label =
        normalizeText($(`label[for="${$select.attr("id")}"]`).text()) ||
        normalizeText($select.closest(".calc-field").find("label").first().text()) ||
        normalizeText($select.prev("label").text()) ||
        normalizeText($select.attr("name")) ||
        normalizeText($select.attr("id")) ||
        `Field ${index + 1}`;

      label = label.replace(/:$/, "");

      const options = [];

      $select.find("option").each((_, optionEl) => {
        const value = normalizeText($(optionEl).text() || $(optionEl).attr("value"));

        if (
          value &&
          !/^select/i.test(value) &&
          !options.includes(value)
        ) {
          options.push(value);
        }
      });

      if (options.length) {
        fields.push({
          _id: makeId(product, ["field", index, label]),
          label,
          options
        });
      }
    });

    if (!fields.length) {
      return res.status(400).json({
        success: false,
        error: "No dropdown fields found on form page",
        product,
        url: targetUrl
      });
    }

    const optionGroups = fields.map((field) => field.options);
    const generatedOptionSets = cartesianProduct(optionGroups);

    const { data: existingRow, error: existingError } = await supabase
      .from("labeled_combinations")
      .select("id, combinations")
      .eq("form_key", product)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    const existingCombinations = existingRow?.combinations || [];

    const existingByOptions = new Map(
      existingCombinations.map((combo) => [
        JSON.stringify(combo.options),
        combo
      ])
    );

    const combinations = generatedOptionSets.map((options) => {
      const existing = existingByOptions.get(JSON.stringify(options));

      return {
        _id: existing?._id || makeId(product, options),
        options,
        price: existing?.price ?? 0
      };
    });

    const suspiciousValues = ["one", "two", "three", "four"];
    
    const hasSuspiciousOnlyValues = fields.some((field) =>
      field.options.some((option) =>
        suspiciousValues.includes(String(option).toLowerCase())
      )
    );
    
    if (hasSuspiciousOnlyValues) {
      return res.status(400).json({
        success: false,
        error: "Scrape produced suspicious option values. Refusing to overwrite saved pricing.",
        product,
        fields
      });
    }
    const payload = {
      form_key: product,
      fields,
      combinations
    };

    let saveError;

    if (existingRow?.id) {
      const { error } = await supabase
        .from("labeled_combinations")
        .update(payload)
        .eq("id", existingRow.id);

      saveError = error;
    } else {
      const { error } = await supabase
        .from("labeled_combinations")
        .insert(payload);

      saveError = error;
    }

    if (saveError) {
      throw saveError;
    }

    return res.status(200).json({
      success: true,
      forms: [
        {
          product,
          fieldsCount: fields.length,
          combinationsCount: combinations.length,
          newCombinationsCount: combinations.filter(
            (combo) => !existingByOptions.has(JSON.stringify(combo.options))
          ).length
        }
      ]
    });
  } catch (err) {
    console.error("Scrape failed:", err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
