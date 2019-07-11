# mongoose-subquery

[![npm version](https://badge.fury.io/js/mongoose-subquery.svg)](https://badge.fury.io/js/mongoose-subquery)

**mongoose-subquery** provides a new `$subquery` operator to make a query on a reference document field.

# Installation

The `mongoose-subquery` module exposes a single function that you can
pass to [Mongoose schema's `plugin()` function](https://mongoosejs.com/docs/api.html#schema_Schema-plugin).

```javascript
const schema = new mongoose.Schema({
  ...
});
schema.plugin(require('mongoose-subquery'));
```

# Example

```javascript
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