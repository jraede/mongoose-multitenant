var barSchema, fooSchema, mongoose, multitenant, should;

mongoose = require('mongoose');

should = require('should');

multitenant = require('../index');

mongoose.connect('mongodb://localhost/multitenant_test');

multitenant.setup();

fooSchema = new mongoose.Schema({
  title: String
});

barSchema = new mongoose.Schema({
  title: String
});

mongoose.mtModel('Foo.Foo', fooSchema);

mongoose.mtModel('Bar', barSchema);

describe('tenant', function() {
  it('should be able to create a foo model for a tenant after the tenant is added', function(done) {
    var fooClass, myFoo,
      _this = this;
    mongoose.mtModel.addTenant('tenant1.subname');
    fooClass = mongoose.mtModel('tenant1.subname.Foo.Foo');
    myFoo = new fooClass({
      title: 'My Foo'
    });
    return myFoo.save(function(err, results) {
      _this.foo = results;
      return mongoose.mtModel('tenant1.subname.Foo.Foo').find(function(err, results) {
        results.length.should.equal(1);
        results[0].title.should.equal('My Foo');
        return done();
      });
    });
  });
  it('should be able to create a foo model for a tenant if the tenant is explicit', function(done) {
    var fooClass, myFoo,
      _this = this;
    fooClass = mongoose.mtModel('tenant1.explicit', 'Foo.Foo');
    myFoo = new fooClass({
      title: 'My Foo'
    });
    return myFoo.save(function(err, results) {
      _this.foo = results;
      console.log(results);
      return mongoose.mtModel('tenant1.explicit.Foo.Foo').find(function(err, results) {
        results.length.should.equal(1);
        results[0].title.should.equal('My Foo');
        return done();
      });
    });
  });
  return it('should default to the last dot-part being the modelname', function(done) {
    var fooClass, myFoo,
      _this = this;
    fooClass = mongoose.mtModel('tenant1.Foo.Bar');
    myFoo = new fooClass({
      title: 'My Foo'
    });
    return myFoo.save(function(err, results) {
      _this.foo = results;
      return mongoose.mtModel('tenant1.Foo.Bar').find(function(err, results) {
        results.length.should.equal(1);
        results[0].title.should.equal('My Foo');
        return done();
      });
    });
  });
});
