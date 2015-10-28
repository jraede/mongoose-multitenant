var fooSchema, mongoose, multitenant, should;

mongoose = require('mongoose');

should = require('should');

multitenant = require('../index');

mongoose.connect('mongodb://localhost/multitenant_test');

multitenant.setup('____');

fooSchema = new mongoose.Schema({
  title: String
});

mongoose.mtModel('Foo', fooSchema);

describe('Custom delimiter', function() {
  return it('should name the collection with custom delimiter', function() {
    var fooClass, myFoo,
      _this = this;
    fooClass = mongoose.mtModel('tenant1.Foo');
    myFoo = new fooClass({
      title: 'My Foo'
    });
    myFoo.collection.name.should.equal('tenant1____foos');
    return myFoo.save(function(err, results) {
      _this.foo = results;
      return mongoose.mtModel('tenant1.Foo').find(function(err, results) {
        results.length.should.equal(1);
        results[0].title.should.equal('My Foo');
        return done();
      });
    });
  });
});
