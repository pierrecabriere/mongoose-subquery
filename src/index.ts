import mongoose, { Schema } from "mongoose";
import { decodeSubquery } from "./utils";

interface MongooseSubqueryOptions {
  beforeDecode?: (query: mongoose.Query<any, any, any, any>, obj: object) => void | Promise<void>;
  initQuery?: (query: mongoose.Query<any, any, any, any>, key: string, obj: object, modelName: string) => void | Promise<void>;
  resolve?: (subquery: mongoose.Query<any, any, any, any>, query: mongoose.Query<any, any, any, any>) => any | Promise<any>;
  bindHooks?: string[];
}

const defaultOptions: MongooseSubqueryOptions = {
  resolve: (subquery) => subquery.find(),
  bindHooks: [
    "count",
    "countDocuments",
    "deleteMany",
    "deleteOne",
    "estimatedDocumentCount",
    "find",
    "findOne",
    "findOneAndDelete",
    "findOneAndRemove",
    "findOneAndReplace",
    "findOneAndUpdate",
    "remove",
    "replaceOne",
    "update",
    "updateOne",
    "updateMany",
  ],
};

function mongooseSubqueryPlugin(schema: Schema, options: MongooseSubqueryOptions = {}) {
  options = Object.assign({}, defaultOptions, options);

  // @ts-ignore
  schema.query.decodeSubquery = function () {
    return decodeSubquery(this, options);
  };

  function run(next) {
    if (typeof this.decodeSubquery === "function") {
      this.decodeSubquery().then(() => next());
    } else {
      next();
    }
  }

  options.bindHooks.forEach((h) => schema.pre(h as any, run));
}

export default mongooseSubqueryPlugin;
export { mongooseSubqueryPlugin, decodeSubquery, MongooseSubqueryOptions };
