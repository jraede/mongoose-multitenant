mongoose = require 'mongoose'
should = require 'should'
multitenant = require('../index')
fooSchema = new mongoose.Schema
	title:String

describe 'Multiple connections', ->
	it 'should have data on one connection but not both', ->
		connectionOne = mongoose.createConnection 'mongodb://localhost/multitenant_test_one'
		connectionTwo = mongoose.createConnection 'mongodb://localhost/multitenant_test_two'
		multitenant.setup '_', connectionOne
		multitenant.setup '_', connectionTwo

		connectionOne.mtModel('Foo', fooSchema)
		connectionTwo.mtModel('Foo', fooSchema)
		fooClassOne = connectionOne.mtModel('tenant1.Foo')
		fooClassTwo = connectionTwo.mtModel('tenant2.Foo')
		
		myFoo = new fooClassOne
			title:'My Foo'

		myFoo.collection.name.should.equal('tenant1_foos')
		myFoo.save (err, results) =>
			@foo = results
			connectionOne.mtModel('tenant1.Foo').find (err, results) ->
				results.length.should.equal(1)
				results[0].title.should.equal('My Foo')
				connectionTwo.mtModel('tenant2.Foo').find (err, results) ->
					results.length.should.equal(0)
					done()
