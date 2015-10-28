mongoose = require 'mongoose'
should = require 'should'
multitenant = require('../index')

mongoose.connect 'mongodb://localhost/multitenant_test'
multitenant.setup('____')

fooSchema = new mongoose.Schema
	title:String


mongoose.mtModel('Foo', fooSchema)




describe 'Custom delimiter', ->
	it 'should name the collection with custom delimiter', ->
		fooClass = mongoose.mtModel('tenant1.Foo')

		myFoo = new fooClass
			title:'My Foo'

		myFoo.collection.name.should.equal('tenant1____foos')
		myFoo.save (err, results) =>
			@foo = results
			mongoose.mtModel('tenant1.Foo').find (err, results) ->
				results.length.should.equal(1)
				results[0].title.should.equal('My Foo')
				done()
