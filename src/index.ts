import {Schema} from "mongoose";

interface IOptions {
  initQuery?: Function
  beforeQuery?: Function,
  beforeInit?: Function
  preventRunning?: boolean
}

function mongooseSubquery(schema: Schema, options: IOptions = {}) {
  const decodeQuery = async function () {
    const mongooseQuery = this;
    const query = mongooseQuery.getQuery();

    if (options.beforeInit) {
      await options.beforeInit(mongooseQuery);
    }

    const referenceFields = {};
    const paths = mongooseQuery.model.schema.paths;
    Object.keys(paths).forEach(fieldKey => {
      const field = paths[fieldKey];
      if ((field.constructor.name === "ObjectId" && field.options.ref)) {
        referenceFields[fieldKey] = field.options.ref;
      } else if (field.constructor.name === "SchemaArray" && (field.$embeddedSchemaType.constructor.name === "ObjectId" && field.$embeddedSchemaType.options.ref)) {
        referenceFields[fieldKey] = field.$embeddedSchemaType.options.ref;
      }
    });

    const decodeRecursive = async function (obj, parentKey?) {
      await Promise.all(Object.keys(obj).map(async key => {
        const value = obj[key];
        if (value && typeof value === "object" && value.$subquery) {
          const modelName = referenceFields[parentKey || key];
          if (modelName) {
            if (options.initQuery) {
              await options.initQuery(mongooseQuery, parentKey || key, obj, modelName);
            }

            const referenceModel = mongooseQuery.model.db.model(modelName);
            let subquery = referenceModel.where(value.$subquery).select("_id");
            if (options.beforeQuery) {
              await options.beforeQuery(subquery, mongooseQuery);
            }

            let operator = value.$operator || "$in";
            delete value.$subquery;
            delete value.$operator;

            const res = await subquery.find();
            const resIds = res.map(doc => doc.id);
            value[operator] = resIds;
          }
        } else if (value && typeof value === "object") {
          await decodeRecursive(value, !/^\$/.test(key) && !Array.isArray(obj) ? key : parentKey);
        }
      }));
    };

    mongooseQuery.decodeSubquery = async () => {
      await decodeRecursive(query);
      mongooseQuery.setQuery(query);
    }

    if (!options.preventRunning) {
      await mongooseQuery.decodeSubquery();
    }
  };

  schema.pre('count', decodeQuery);
  schema.pre('deleteMany', decodeQuery);
  schema.pre('deleteOne', decodeQuery);
  schema.pre('find', decodeQuery);
  schema.pre('findOne', decodeQuery);
  schema.pre('findOneAndDelete', decodeQuery);
  schema.pre('findOneAndRemove', decodeQuery);
  schema.pre('findOneAndUpdate', decodeQuery);
  schema.pre('remove', decodeQuery);
  schema.pre('update', decodeQuery);
  schema.pre('updateOne', decodeQuery);
  schema.pre('updateMany', decodeQuery);
}

export default mongooseSubquery;