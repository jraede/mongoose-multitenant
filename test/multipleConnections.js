var fooSchema, mongoose, multitenant, should;

mongoose = require('mongoose');

should = require('should');

multitenant = require('../index');

fooSchema = new mongoose.Schema({
  title: String
});

describe('Multiple connections', function() {
  return it('should have data on one connection but not both', function() {
    var connectionOne, connectionTwo, fooClassOne, fooClassTwo, myFoo,
      _this = this;
    connectionOne = mongoose.createConnection('mongodb://localhost/multitenant_test_one');
    connectionTwo = mongoose.createConnection('mongodb://localhost/multitenant_test_two');
    multitenant.setup('_', connectionOne);
    multitenant.setup('_', connectionTwo);
    connectionOne.mtModel('Foo', fooSchema);
    connectionTwo.mtModel('Foo', fooSchema);
    fooClassOne = connectionOne.mtModel('tenant1.Foo');
    fooClassTwo = connectionTwo.mtModel('tenant2.Foo');
    myFoo = new fooClassOne({
      title: 'My Foo'
    });
    myFoo.collection.name.should.equal('tenant1_foos');
    return myFoo.save(function(err, results) {
      _this.foo = results;
      return connectionOne.mtModel('tenant1.Foo').find(function(err, results) {
        results.length.should.equal(1);
        results[0].title.should.equal('My Foo');
        return connectionTwo.mtModel('tenant2.Foo').find(function(err, results) {
          results.length.should.equal(0);
          return done();
        });
      });
    });
  });
});
