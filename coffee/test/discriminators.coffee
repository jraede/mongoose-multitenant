mongoose = require('mongoose')
should = require('should')
async = require('async')
multitenant = require('../index')
mongoose.connect 'mongodb://localhost/multitenant_test'
util = require('util')

multitenant.setup('.')

fooSchema = new (mongoose.Schema)(
  title: String
  single:
    type: mongoose.Schema.Types.ObjectId
    ref: 'Bar.Container')

abstractSchema = ->
  mongoose.Schema.apply this, arguments
  @add title: String
  return

util.inherits abstractSchema, mongoose.Schema
containerSchema = new abstractSchema({})
barSchema = new abstractSchema(subTitle: String)
bazSchema = new abstractSchema(superTitle: String)
mongoose.mtModel 'Bar.Foo', fooSchema
mongoose.mtModel 'Bar.Container', containerSchema
#mongoose.mtModel('Bar.Bar', barSchema);
describe 'with discriminators', ->
  it 'should save and reload with the saved data', (done) ->
    fooClass = mongoose.mtModel('tenant1', 'Bar.Foo')
    containerClass = mongoose.mtModel('tenant1', 'Bar.Container')
    barClass = containerClass.discriminator('Bar.Bar', barSchema)
    bazClass = containerClass.discriminator('Bar.Baz', bazSchema)
    async.waterfall [
      (cb) ->
        new barClass(
          title: 'bar one'
          subtitle: 'the motion picture').save (err, bar) ->
          cb err, barOne: bar
          return
        return
      (p, cb) ->
        new barClass(
          title: 'bar two'
          subtitle: 'wrath of bar').save (err, bar) ->
          p.barTwo = bar
          cb err, p
          return
        return
      (p, cb) ->
        new bazClass(
          title: 'baz'
          superTitle: 'presented').save (err, baz) ->
          p.baz = baz
          cb err, p
          return
        return
      (p, cb) ->
        new fooClass(
          title: 'foo'
          single: p.barOne._id).save (err, foo) ->
          p.foo = foo
          cb err, p
          return
        return
      (p, cb) ->
        p.foo.single = p.baz._id
        p.foo.save (err, foo) ->
          p.foo = foo
          cb err, p
          return
        return
      (p, cb) ->
        #reload the foo
        fooClass.findOne(_id: p.foo._id).exec (err, foo) ->
          if err
            console.log util.inspect(err)
          console.log util.inspect(foo)
          p.foo = foo
          cb err, p
          return
        return
    ], (err, p) ->
      p.foo.single.toString().should.equal p.baz._id.toString()
      done()
    return
