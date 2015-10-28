var abstractSchema, async, barSchema, bazSchema, containerSchema, fooSchema, mongoose, multitenant, should, util;

mongoose = require('mongoose');

should = require('should');

async = require('async');

multitenant = require('../index');

mongoose.connect('mongodb://localhost/multitenant_test');

util = require('util');

multitenant.setup('.');

fooSchema = new mongoose.Schema({
  title: String,
  single: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bar.Container'
  }
});

abstractSchema = function() {
  mongoose.Schema.apply(this, arguments);
  this.add({
    title: String
  });
};

util.inherits(abstractSchema, mongoose.Schema);

containerSchema = new abstractSchema({});

barSchema = new abstractSchema({
  subTitle: String
});

bazSchema = new abstractSchema({
  superTitle: String
});

mongoose.mtModel('Bar.Foo', fooSchema);

mongoose.mtModel('Bar.Container', containerSchema);

describe('with discriminators', function() {
  return it('should save and reload with the saved data', function(done) {
    var barClass, bazClass, containerClass, fooClass;
    fooClass = mongoose.mtModel('tenant1', 'Bar.Foo');
    containerClass = mongoose.mtModel('tenant1', 'Bar.Container');
    barClass = containerClass.discriminator('Bar.Bar', barSchema);
    bazClass = containerClass.discriminator('Bar.Baz', bazSchema);
    async.waterfall([
      function(cb) {
        new barClass({
          title: 'bar one',
          subtitle: 'the motion picture'
        }).save(function(err, bar) {
          cb(err, {
            barOne: bar
          });
        });
      }, function(p, cb) {
        new barClass({
          title: 'bar two',
          subtitle: 'wrath of bar'
        }).save(function(err, bar) {
          p.barTwo = bar;
          cb(err, p);
        });
      }, function(p, cb) {
        new bazClass({
          title: 'baz',
          superTitle: 'presented'
        }).save(function(err, baz) {
          p.baz = baz;
          cb(err, p);
        });
      }, function(p, cb) {
        new fooClass({
          title: 'foo',
          single: p.barOne._id
        }).save(function(err, foo) {
          p.foo = foo;
          cb(err, p);
        });
      }, function(p, cb) {
        p.foo.single = p.baz._id;
        p.foo.save(function(err, foo) {
          p.foo = foo;
          cb(err, p);
        });
      }, function(p, cb) {
        fooClass.findOne({
          _id: p.foo._id
        }).exec(function(err, foo) {
          if (err) {
            console.log(util.inspect(err));
          }
          console.log(util.inspect(foo));
          p.foo = foo;
          cb(err, p);
        });
      }
    ], function(err, p) {
      p.foo.single.toString().should.equal(p.baz._id.toString());
      return done();
    });
  });
});
