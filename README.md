# mongoose-subquery

[![npm version](https://badge.fury.io/js/mongoose-subquery.svg)](https://badge.fury.io/js/mongoose-subquery)

**mongoose-subquery** provides a new `$subquery` operator to make a query on a reference document field.

# Installation

The `mongoose-subquery` module adds a method to decode $subquery operator in your queries. By default, the plugin bind this method with all pre middlewares to automatically decode the input payload.
However, you can configure the plugin to prevent binding some middlewares and then calling the `Query.decodeSubquery` function.

```typescript
import mongooseSubquery from "mongoose-subquery";

const schema = new mongoose.Schema({
    ...
});
schema.plugin(mongooseSubquery, { ...options });
```

# Configuration

```typescript
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
```

### beforeDecode

The `beforeDecode` function is executed when the initial query (with `$subquery` within conditions) is decoded

### initQuery

You can provide a `initQuery` function that will be called each time a new mongoose.Query is instantiate by mongoose-subquery

```typescript
schema.plugin(mongooseSubquery, {
    initQuery: (query, key, obj, modelName) => {
        console.log(`new query created on ${modelName} with conds ${query.getQuery()}`);
    }
});
```

### resolve

The `resolve` option allows you to override the default behavior that simply run a `subquery.find()`, for more complex operations

```typescript
schema.plugin(mongooseSubquery, {
    resolve: async (subquery) => {
        const countQuery = subquery.clone();
        const count = await countQuery.estimatedDocumentCount();
        
        if (count > 100) {
            throw new Error(`This query returns too many docs`);
        }
        
        return await subquery.find();
    }
});
```

# Example

```typescript
const roleSchema = new Schema({
  name: String,
  admin: Boolean
});
const Role = mongoose.model('Role', roleSchema, 'Roles');

const ruleSchema = new Schema({
  role: { type: ObjectId, ref: 'Role' }
});
ruleSchema.plugin(require('mongoose-subquery'));
const Rule = mongoose.model('Rule', ruleSchema, 'Rules');

Rule.find({ role: { $subquery: { admin: true } } });
```

Will return all rules where the referenced role matches the subquery `{ admin: true }`
