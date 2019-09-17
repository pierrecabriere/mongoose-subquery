import { Schema } from "mongoose";

interface IOptions {
  transformSubquery?: Function
}

function mongooseSubquery(schema: Schema, options: IOptions = {}) {
  const decodeQuery = async function () {
    const mongooseQuery = this;

    // get reference fields in schema
    const referenceFields = {};
    Object.keys(schema.obj).forEach(fieldKey => {
      const field = schema.obj[fieldKey];
      if (field && field.type && field.type.schemaName === "ObjectId" && field.ref) {
        referenceFields[fieldKey] = field;
      }
    });

    const decodeRecursive = async function (obj) {
      if (Array.isArray(obj)) {
        obj = Object.assign({}, obj);
      }

      await Promise.all(Object.keys(obj).map(async key => {
        const value = obj[key];
        if (value && typeof value === "object" && value.$subquery) {
          // @ts-ignore
          const referenceModel = mongooseQuery.model.db.model(referenceFields[key].ref);
          let subquery = referenceModel.find(value.$subquery, "_id");
          if (options.transformSubquery) {
            subquery = await options.transformSubquery(subquery);
          }
          const res = await subquery;
          const resIds = res.map(doc => doc.id);
          delete value.$subquery;
          value.$in = resIds;
        } else if (value && typeof value === "object") {
          await decodeRecursive(value);
        }
      }));
    };

    await decodeRecursive(mongooseQuery.getQuery());
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