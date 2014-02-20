mongoose = require 'mongoose'
should = require 'should'
multitenant = require '../index'

mongoose.connect 'mongodb://localhost/multitenant_test'

fooSchema = new mongoose.Schema
	title:String

bazSchema = new mongoose.Schema
	title:String
subSchema = new mongoose.Schema
	foo:
		type:mongoose.Schema.Types.ObjectId
		ref:'Foo'
		$tenant:true
barSchema = new mongoose.Schema
	scalar:String
	array:[
			type:mongoose.Schema.Types.ObjectId
			ref:'Foo'
			$tenant:true
			$testytest:'asdf'
	]
	subs:[subSchema]
	single:
		type:mongoose.Schema.Types.ObjectId
		ref:'Foo'
		$tenant:true
	multilevel:
		foo1:
			type:mongoose.Schema.Types.ObjectId
			ref:'Foo'
			$tenant:true
		foo2:
			type:mongoose.Schema.Types.ObjectId
			ref:'Foo'
			$tenant:true
	notTenant:
		type:mongoose.Schema.Types.ObjectId
		ref:'Baz'
		$tenant:false


foobSchema = new mongoose.Schema
	_boof:
		type:mongoose.Schema.Types.ObjectId
		ref:'Boof'
		$tenant:true
	title:String

boofSchema = new mongoose.Schema
	_foob:
		type:mongoose.Schema.Types.ObjectId
		ref:'Foob'
		$tenant:true
	title:String

mongoose.mtModel('Foo', fooSchema)
mongoose.mtModel('Bar', barSchema)
mongoose.model('Baz', bazSchema)

mongoose.mtModel('Foob', foobSchema)
mongoose.mtModel('Boof', boofSchema)



describe 'Multitenant', ->
	it 'should be able to create a foo model for a tenant', (done) ->
		fooClass = mongoose.mtModel('tenant1.Foo')

		myFoo = new fooClass
			title:'My Foo'

		myFoo.save (err, results) =>
			@foo = results
			mongoose.mtModel('tenant1.Foo').find (err, results) ->
				results.length.should.equal(1)
				results[0].title.should.equal('My Foo')
				done()

	it 'should be able to create a foo model for a tenant with a . in its name', (done) ->
		fooClass = mongoose.mtModel('dottenant.org.Foo')

		myFoo = new fooClass
			title:'My Foo'

		myFoo.save (err, results) =>
			mongoose.mtModel('dottenant.org.Foo').find (err, results) ->
				results.length.should.equal(1)
				results[0].title.should.equal('My Foo')
				done()


	it 'should copy non-mongoose config options through to schema duplicates', ->
		mongoose.mtModel('tenant1.Bar').schema.paths.array.caster.options.$tenant.should.equal(true)
		mongoose.mtModel('tenant1.Bar').schema.paths.array.caster.options.$testytest.should.equal('asdf')
	it 'should assign tenantId to the schema', ->
		fooClass = mongoose.mtModel('tenant1.Foo')
		myFoo = new mongoose.mtModel('tenant1.Foo')
			title:'My Foo'
		myFoo.getTenantId().should.equal('tenant1')

	it 'should be able to create a foo model for a second tenant', (done) ->
		fooClass = mongoose.mtModel('tenant2.Foo')

		myFoo = new fooClass
			title:'My Foo'
		myFoo.save (err, results) ->
			mongoose.mtModel('tenant2.Foo').find (err, results) ->
				results.length.should.equal(1)
				results[0].title.should.equal('My Foo')
				done()

	# Now the crazy stuff
	it 'should handle array references per tenant', (done) ->
		barClass = mongoose.mtModel('tenant1.Bar')
		myBar = new barClass
			array:[@foo._id]

		myBar.save (err, results) ->
			mongoose.mtModel('tenant1.Bar').findById(results._id).populate('array').exec (err, res) ->
				res.array[0].title.should.equal('My Foo')
				done()

	it 'should handle sub schema per tenant', (done) ->
		barClass = mongoose.mtModel('tenant1.Bar')
		myBar = new barClass
			subs:[
					foo:@foo._id
			]

		myBar.save (err, results) ->
			mongoose.mtModel('tenant1.Bar').findById(results._id).populate('subs.foo').exec (err, res) ->
				res.subs[0].foo.title.should.equal('My Foo')
				done()
	it 'should not populate refs to collections outside of tenancy', (done) ->
		barClass = mongoose.mtModel('tenant2.Bar')
		myBar = new barClass
			single:@foo._id
		myBar.save (err, results) ->
			mongoose.mtModel('tenant2.Bar').findById(results._id).populate('single').exec (err, res) ->
				should.not.exist(res.single)
				done()

	it 'should populate tenant to non-tenant normally', (done) ->
		bazClass = mongoose.model('Baz')

		myBaz = new bazClass
			title:'My Baz'
		myBaz.save (err, res) =>
			@baz = res

			barClass = mongoose.mtModel('tenant3.Bar')
			myBar = new barClass
				notTenant:@baz._id
			myBar.save (err, results) ->
				mongoose.mtModel('tenant3.Bar').findById(results._id).populate('notTenant').exec (err, res) ->
					res.notTenant.title.should.equal('My Baz')
					done()

	it 'should handle precompile with circular references', (done) ->
		foobClass = mongoose.mtModel('tenant3.Foob')
		done()


