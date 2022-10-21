import { MongooseSubqueryOptions } from "./index";

export async function decodeSubquery(query: any, options: MongooseSubqueryOptions = {}) {
  const cacheKey = JSON.stringify(query._conditions);

  if (query.decodeSubqueryPromises?.[cacheKey]) {
    return query.decodeSubqueryPromises[cacheKey];
  }

  const decodeRecursive = async function (obj?, referenceFields?, parentKey?) {
    let initial;

    if (!obj) {
      initial = JSON.stringify(query._conditions);
      obj = JSON.parse(JSON.stringify(query._conditions));

      if (options.beforeDecode) {
        await options.beforeDecode(query, obj);
      }
    }

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
        if (field.constructor.name === "DocumentArrayPath") {
          Object.keys(field.$embeddedSchemaType.schema.paths).forEach((nestedKey) => {
            const nestedField = field.$embeddedSchemaType.schema.paths[nestedKey];
            if (
              nestedField.constructor.name === "ObjectId" &&
              nestedField.options.ref
            ) {
              console.log("nestedField", fieldKey, nestedKey, nestedField.options.ref);
              referenceFields[`${fieldKey}.${nestedKey}`] = nestedField.options.ref;
            }
          });
        }

      });
    }

    await Promise.all(
      Object.keys(obj).map(async (key) => {
        const value = obj[key];
        if (value && typeof value === "object" && value['$subquery']) {
          const modelName = referenceFields[parentKey || key];
          if (modelName) {
            if (options.initQuery) {
              await options.initQuery(query, parentKey || key, obj, modelName);
            }

            const referenceModel = query.model.db.model(modelName);
            let subquery = referenceModel.where(value.$subquery).select("_id").lean();

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

    if (initial) {
      const conditionsChanged = JSON.stringify(query._conditions) === initial;
      if (conditionsChanged) {
        query._conditions = obj;
      }
    }

    return obj;
  };

  query.decodeSubqueryPromises = query.decodeSubqueryPromises || {};
  query.decodeSubqueryPromises[cacheKey] = decodeRecursive();

  return query.decodeSubqueryPromises[cacheKey];
}
