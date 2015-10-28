Mongoose Multitenant
=====================
[![Build Status](https://travis-ci.org/jraede/mongoose-multitenant.png?branch=v0.8.0)](https://travis-ci.org/jraede/mongoose-multitenant)

This package facilitates horizontal multitenancy in one MongoDB database, obviously using Mongoose as the interaction layer. 

## Basics
With this package, you can use one schema per model, as you would normally with Mongoose, and then use special methods and syntax apply that schema to different tenant collections. 

Instead of using `mongoose.model(name, schema)` to compile your model, you would now use `mongoose.mtModel(name, schema)`. This still creates the Mongoose model as normal, but adds some additional functionality. Specifically, you can retrieve a model for a specific tenant using this syntax:

`mongoose.mtModel('tenantId.modelName')`

When that happens, the package will check if that model for that tenant has already been compiled. If not, it creates a copy of the base model's schema, updates any `refs` to other collections, and then compiles a new model with the new schema, with a collection name of `tenantId__originalCollectionName`. All per-tenant models are *lazy-loaded*, meaning that they won't take up memory until they are needed.




## Usage
#### Pull in requirements
```javascript
var mongoose = require('mongoose');
var multitenant = require('mongoose-multitenant');

mongoose.connect('mongodb://localhost/multitenant');
multitenant.setup();
```

#### Changing collection delimiter
Thanks to @watnotte for this - if you want to change the delimiter from the default `__` you can do the following:

```javascript
var multitenant = require('mongoose-multitenant')
multitenant.setup('CUSTOM_DELIMITER');
```

#### Using custom or multiple connections
This library also supports using `mtModel` on a non-default connection.  Note that the schema must be compiled on every connection.

```javascript
var mongoose = require('mongoose'),
    multitenant = require('mongoose-multitenant');

var schema = new mongoose.Schema({...});
var connection = mongoose.createConnection('mongodb://localhost/example');
multitenant.setup(connection);
var multitenantModel = connection.mtModel('SomeModel', schema);
var tenantModel = connection('tenant.SomeModel');
```

The `setup` method can take both a connection and a delimiter, for example:

```javascript
var mongoose = require('mongoose'),
    multitenant = require('mongoose-multitenant');

var connection = mongoose.createConnection('mongodb://localhost/example');
multitenant.setup(connection, 'CUSTOM_DELIMTER');
```

The `setup` method will default to using the `mongoose` default connection if one is not specified.

#### Create a schema
With mongoose-multitenant you use all the same syntax for schema creation as you normally do with Mongoose, with the addition of the `$tenant` property on document references. This tells the system whether it is a reference to a document for the same tenant (`true`) or a root-level document without a tenant (`false`)

```javascript
var barSchema = new mongoose.Schema({
    title:String,
    _foos:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Foo',
        $tenant:true
    }]
});

var fooSchema = new mongoose.Schema({
    title:String,
    date:Date
});
```

#### Compile the models
Instead of using `mongoose.model` to compile, you use `mongoose.mtModel`.

```javascript
mongoose.mtModel('Bar', barSchema);
mongoose.mtModel('Foo', fooSchema);
```

#### Use the models
Basic usage:
```javascript
// This returns a new Foo model for tenant "tenant1"
var fooConstructor = mongoose.mtModel('tenant1.Foo');
var myFoo = new fooConstructor({
    title:'My Foo',
    date:new Date()
});

myFoo.save(function(err, result) {
    // This saved it to the collection named "tenant1__foos"
});
```

And make use of refs/populate:
```javascript
var barConstructor = mongoose.mtModel('tenant1.Bar');
var myBar = new barConstructor({
    title:'My Bar'
    _foos:[myFoo._id]
});

myBar.save(function(err, result) {
    // Saved to the collection named "tenant1__bars"

    barConstructor.find().populate('foos').exec(function(err, results) {
        console.log(results[0]._foos[0].title); // "My Foo"
    });
});
```

But you can't populate across tenancies:
```javascript
var tenant2Bar = mongoose.mtModel('tenant2.Bar');
var newBar = new tenant2Bar({
    title:'New Bar',
    _foos:[myFoo._id]
});

newBar.save(function(err, result) {
    tenant2Bar.find().populate('foos').exec(function(err, results) {
        console.log(results[0]._foos[0]); // "undefined"
    });
});
```

## Helper Methods
In addition to this base functionality, each per-tenant model gets two new schema methods: `getTenantId()` and `getModel()`. 

#### getTenantId()
This does what you think it does - returns the tenant ID for the model.

#### getModel()
This can be used in your mongoose middleware methods to get the related model class. E.g.

```javascript
barSchema.pre('save', function(next) {
    
    // This gets Foos in the same tenancy as this Bar
    this.getModel('Foo').find({_id:{$in:this._foos}}, function(err, foos) {
        // Do something to the related Foos.
        next()
    });
});
```

## Credits
* Brian Kirchoff for his great mongoose-schema-extend package
