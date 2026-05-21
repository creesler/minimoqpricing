const { MongoClient } = require("mongodb");

function cleanDoc(doc) {
  if (!doc) return null;

  const copy = JSON.parse(JSON.stringify(doc));

  // Keep samples readable
  if (Array.isArray(copy.combinations)) {
    copy.combinations_sample = copy.combinations.slice(0, 3);
    copy.combinations_count = copy.combinations.length;
    delete copy.combinations;
  }

  if (Array.isArray(copy.options) && copy.options.length > 20) {
    copy.options = copy.options.slice(0, 20);
  }

  return copy;
}

module.exports = async function handler(req, res) {
  if (!process.env.MONGO_URI) {
    return res.status(500).json({ error: "Missing MONGO_URI" });
  }

  const mongo = new MongoClient(process.env.MONGO_URI);

  try {
    await mongo.connect();

    const db = mongo.db("test");
    const collections = await db.listCollections().toArray();

    const report = [];

    for (const collectionInfo of collections) {
      const name = collectionInfo.name;
      const collection = db.collection(name);

      const count = await collection.estimatedDocumentCount();
      const sampleDocs = await collection.find({}).limit(3).toArray();

      const sampleKeys = [
        ...new Set(sampleDocs.flatMap((doc) => Object.keys(doc)))
      ];

      const item = {
        collection: name,
        count,
        sampleKeys,
        samples: sampleDocs.map(cleanDoc)
      };

      // Special summary for old simple calculator collection
      if (name === "combinations") {
        item.summary = {
          groups: await collection.distinct("group"),
          optionLengths: await collection.aggregate([
            {
              $project: {
                optionLength: {
                  $cond: [
                    { $isArray: "$options" },
                    { $size: "$options" },
                    null
                  ]
                }
              }
            },
            {
              $group: {
                _id: "$optionLength",
                count: { $sum: 1 }
              }
            },
            {
              $sort: { _id: 1 }
            }
          ]).toArray()
        };
      }

      // Special summary for labeled product forms
      if (name === "labeledcombinations") {
        item.summary = {
          possibleFormKeys: await collection.aggregate([
            {
              $project: {
                formKey: {
                  $ifNull: [
                    "$formKey",
                    {
                      $ifNull: [
                        "$form_key",
                        {
                          $ifNull: [
                            "$form",
                            {
                              $ifNull: [
                                "$label",
                                {
                                  $ifNull: ["$name", "$title"]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                fieldsCount: {
                  $cond: [
                    { $isArray: "$fields" },
                    { $size: "$fields" },
                    null
                  ]
                },
                combinationsCount: {
                  $cond: [
                    { $isArray: "$combinations" },
                    { $size: "$combinations" },
                    null
                  ]
                }
              }
            }
          ]).toArray()
        };
      }

      report.push(item);
    }

    return res.status(200).json({
      database: db.databaseName,
      collectionCount: collections.length,
      collections: report
    });
  } catch (err) {
    return res.status(500).json({
      error: "Mongo audit failed",
      details: err.message
    });
  } finally {
    await mongo.close();
  }
};
