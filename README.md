# mongoose-subquery

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
const Role = mongoose.model('role', roleSchema, 'roles');

const ruleSchema = new Schema({
  role: { type: ObjectId, ref: 'role' }
});
ruleSchema.plugin(require('mongoose-subquery'));
const Rule = mongoose.model('rule', ruleSchema, 'rules');

Rule.find({ role: { $subquery: { admin: true } } });
```