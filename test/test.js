var barSchema, bazSchema, boofSchema, fooSchema, foobSchema, mongoose, multitenant, should, subSchema;

mongoose = require('mongoose');

should = require('should');

multitenant = require('../index');

mongoose.connect('mongodb://localhost/multitenant_test');

fooSchema = new mongoose.Schema({
  title: String
});

bazSchema = new mongoose.Schema({
  title: String
});

subSchema = new mongoose.Schema({
  foo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Foo',
    $tenant: true
  }
});

barSchema = new mongoose.Schema({
  scalar: String,
  array: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Foo',
      $tenant: true,
      $testytest: 'asdf'
    }
  ],
  subs: [subSchema],
  single: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Foo',
    $tenant: true
  },
  multilevel: {
    foo1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Foo',
      $tenant: true
    },
    foo2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Foo',
      $tenant: true
    }
  },
  notTenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Baz',
    $tenant: false
  }
});

foobSchema = new mongoose.Schema({
  _boof: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boof',
    $tenant: true
  },
  title: String
});

boofSchema = new mongoose.Schema({
  _foob: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Foob',
    $tenant: true
  },
  title: String
});

mongoose.mtModel('Foo', fooSchema);

mongoose.mtModel('Bar', barSchema);

mongoose.model('Baz', bazSchema);

mongoose.mtModel('Foob', foobSchema);

mongoose.mtModel('Boof', boofSchema);

describe('Multitenant', function() {
  it('should be able to create a foo model for a tenant', function(done) {
    var fooClass, myFoo,
      _this = this;
    fooClass = mongoose.mtModel('tenant1.Foo');
    myFoo = new fooClass({
      title: 'My Foo'
    });
    return myFoo.save(function(err, results) {
      _this.foo = results;
      return mongoose.mtModel('tenant1.Foo').find(function(err, results) {
        results.length.should.equal(1);
        results[0].title.should.equal('My Foo');
        return done();
      });
    });
  });
  it('should copy non-mongoose config options through to schema duplicates', function() {
    mongoose.mtModel('tenant1.Bar').schema.paths.array.caster.options.$tenant.should.equal(true);
    return mongoose.mtModel('tenant1.Bar').schema.paths.array.caster.options.$testytest.should.equal('asdf');
  });
  it('should assign tenantId to the schema', function() {
    var fooClass, myFoo;
    fooClass = mongoose.mtModel('tenant1.Foo');
    myFoo = new mongoose.mtModel('tenant1.Foo')({
      title: 'My Foo'
    });
    return myFoo.getTenantId().should.equal('tenant1');
  });
  it('should be able to create a foo model for a second tenant', function(done) {
    var fooClass, myFoo;
    fooClass = mongoose.mtModel('tenant2.Foo');
    myFoo = new fooClass({
      title: 'My Foo'
    });
    return myFoo.save(function(err, results) {
      return mongoose.mtModel('tenant2.Foo').find(function(err, results) {
        results.length.should.equal(1);
        results[0].title.should.equal('My Foo');
        return done();
      });
    });
  });
  it('should handle array references per tenant', function(done) {
    var barClass, myBar;
    barClass = mongoose.mtModel('tenant1.Bar');
    myBar = new barClass({
      array: [this.foo._id]
    });
    return myBar.save(function(err, results) {
      return mongoose.mtModel('tenant1.Bar').findById(results._id).populate('array').exec(function(err, res) {
        res.array[0].title.should.equal('My Foo');
        return done();
      });
    });
  });
  it('should handle sub schema per tenant', function(done) {
    var barClass, myBar;
    barClass = mongoose.mtModel('tenant1.Bar');
    myBar = new barClass({
      subs: [
        {
          foo: this.foo._id
        }
      ]
    });
    return myBar.save(function(err, results) {
      return mongoose.mtModel('tenant1.Bar').findById(results._id).populate('subs.foo').exec(function(err, res) {
        res.subs[0].foo.title.should.equal('My Foo');
        return done();
      });
    });
  });
  it('should not populate refs to collections outside of tenancy', function(done) {
    var barClass, myBar;
    barClass = mongoose.mtModel('tenant2.Bar');
    myBar = new barClass({
      single: this.foo._id
    });
    return myBar.save(function(err, results) {
      return mongoose.mtModel('tenant2.Bar').findById(results._id).populate('single').exec(function(err, res) {
        should.not.exist(res.single);
        return done();
      });
    });
  });
  it('should populate tenant to non-tenant normally', function(done) {
    var bazClass, myBaz,
      _this = this;
    bazClass = mongoose.model('Baz');
    myBaz = new bazClass({
      title: 'My Baz'
    });
    return myBaz.save(function(err, res) {
      var barClass, myBar;
      _this.baz = res;
      barClass = mongoose.mtModel('tenant3.Bar');
      myBar = new barClass({
        notTenant: _this.baz._id
      });
      return myBar.save(function(err, results) {
        return mongoose.mtModel('tenant3.Bar').findById(results._id).populate('notTenant').exec(function(err, res) {
          res.notTenant.title.should.equal('My Baz');
          return done();
        });
      });
    });
  });
  return it('should handle precompile with circular references', function(done) {
    var foobClass;
    foobClass = mongoose.mtModel('tenant3.Foob');
    return done();
  });
});
