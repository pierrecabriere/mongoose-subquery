import { MongooseSubqueryOptions } from "./index";

export async function decodeSubquery(query: any, options: MongooseSubqueryOptions = {}) {
  const cacheKey = JSON.stringify(query._conditions);

  query.decodeSubqueryPromises = query.decodeSubqueryPromises || {};
  if (query.decodeSubqueryPromises[cacheKey]) {
    return query.decodeSubqueryPromises[cacheKey].then((obj) => (query._conditions = obj));
  }

  const decodeRecursive = async function (obj, referenceFields?, parentKey?) {
    if (!referenceFields) {
      referenceFields = {};
      const paths = query.model.schema.paths;
      Object.keys(paths).forEach((fieldKey) => {
        const field = paths[fieldKey];
        if (field.constructor.name === "ObjectId" && field.options.ref) {
          referenceFields[fieldKey] = field.options.ref;
        } else if (field.constructor.name === "SchemaArray" && field.$embeddedSchemaType.constructor.name === "ObjectId" && field.$embeddedSchemaType.options.ref) {
          referenceFields[fieldKey] = field.$embeddedSchemaType.options.ref;
        }
      });
    }

    await Promise.all(
      Object.keys(obj).map(async (key) => {
        const value = obj[key];
        if (value && typeof value === "object" && "$subquery" in value) {
          const modelName = referenceFields[parentKey || key];
          if (modelName) {
            if (options.initQuery) {
              await options.initQuery(query, parentKey || key, obj, modelName);
            }

            const referenceModel = query.model.db.model(modelName);
            let subquery = referenceModel.where(value.$subquery).select("_id");
            if (options.beforeQuery) {
              await options.beforeQuery(subquery, query);
            }

            let operator = value.$operator;
            let _options = value.$options || {};
            delete value.$subquery;
            delete value.$operator;
            delete value.$options;

            subquery.setOptions(_options);

            let res;
            if (options.resolve) {
              res = await options.resolve(subquery, query);
            } else {
              res = await subquery.find();
            }

            res = Array.isArray(res) ? res.map((r) => r._id) : res && typeof res === "object" && "_id" in res ? res._id : new String(res);

            if (/^\$/.test(key) && !operator) {
              obj[key] = res;
            } else {
              value[operator || "$in"] = res;
            }
          }
        } else if (value && typeof value === "object") {
          await decodeRecursive(value, referenceFields, !/^\$/.test(key) && !Array.isArray(obj) ? key : parentKey);
        }
      }),
    );

    return obj;
  };

  query.decodeSubqueryPromises[cacheKey] = decodeRecursive(JSON.parse(JSON.stringify(query._conditions)));
  return query.decodeSubqueryPromises[cacheKey].then((obj) => (query._conditions = obj));
}
