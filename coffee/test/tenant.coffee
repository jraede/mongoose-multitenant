mongoose = require 'mongoose'
should = require 'should'
multitenant = require '../index'

mongoose.connect 'mongodb://localhost/multitenant_test'
multitenant.setup()
fooSchema = new mongoose.Schema
	title:String

barSchema = new mongoose.Schema
	title:String
mongoose.mtModel('Foo.Foo', fooSchema)
mongoose.mtModel('Bar', barSchema)



describe 'tenant', ->
	it 'should be able to create a foo model for a tenant after the tenant is added', (done) ->
		mongoose.mtModel.addTenant 'tenant1.subname'
		fooClass = mongoose.mtModel('tenant1.subname.Foo.Foo')

		myFoo = new fooClass
			title:'My Foo'

		myFoo.save (err, results) =>
			@foo = results
			mongoose.mtModel('tenant1.subname.Foo.Foo').find (err, results) ->
				results.length.should.equal(1)
				results[0].title.should.equal('My Foo')
				done()

	it 'should be able to create a foo model for a tenant if the tenant is explicit', (done) ->
		fooClass = mongoose.mtModel('tenant1.explicit', 'Foo.Foo')

		myFoo = new fooClass
			title:'My Foo'

		myFoo.save (err, results) =>
			@foo = results
			console.log results
			mongoose.mtModel('tenant1.explicit.Foo.Foo').find (err, results) ->
				results.length.should.equal(1)
				results[0].title.should.equal('My Foo')
				done()

	it 'should default to the last dot-part being the modelname', (done) ->
		fooClass = mongoose.mtModel('tenant1.Foo.Bar')

		myFoo = new fooClass
			title:'My Foo'

		myFoo.save (err, results) =>
			@foo = results
			mongoose.mtModel('tenant1.Foo.Bar').find (err, results) ->
				results.length.should.equal(1)
				results[0].title.should.equal('My Foo')
				done()
