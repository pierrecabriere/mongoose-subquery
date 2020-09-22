import {Schema} from "mongoose";

interface IOptions {
  transformSubquery?: Function,
  transformSchema?: Function
}

function mongooseSubquery(schema: Schema, options: IOptions = {}) {
  const decodeQuery = async function () {
    const mongooseQuery = this;
    const query = mongooseQuery.getQuery();

    const referenceFields = {};
    // @ts-ignore
    const paths = schema.paths;
    Object.keys(paths).forEach(fieldKey => {
      const field = paths[fieldKey];
      if ((field.constructor.name === "ObjectId" && field.options.ref)) {
        referenceFields[fieldKey] = field.options.ref;
      } else if (field.constructor.name === "SchemaArray" && (field.$embeddedSchemaType.constructor.name === "ObjectId" && field.$embeddedSchemaType.options.ref)) {
        referenceFields[fieldKey] = field.$embeddedSchemaType.options.ref;
      }
    });

    const decodeRecursive = async function (obj, parentKey?) {
      if (Array.isArray(obj)) {
        obj = Object.assign({}, obj);
      }

      await Promise.all(Object.keys(obj).map(async key => {
        const value = obj[key];
        if (value && typeof value === "object" && value.$subquery) {
          if (options.transformSubquery) {
            options.transformSchema && await options.transformSchema(schema, mongooseQuery, obj);
          }
          const referenceModel = mongooseQuery.model.db.model(referenceFields[parentKey || key]);
          let subquery = referenceModel.find(value.$subquery, "_id");
          let operator = value.$operator || "$in";
          delete value.$subquery;
          delete value.$operator;

          if (options.transformSubquery) {
            subquery = await options.transformSubquery(subquery);
          }
          const res = await subquery;
          const resIds = res.map(doc => doc.id);
          value[operator] = resIds;
        } else if (value && typeof value === "object") {
          await decodeRecursive(value, !/^\$/.test(key) ? key : parentKey);
        }
      }));
    };

    try {
      await decodeRecursive(query);
    } catch (e) {
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