###
Multi-tenancy for Mongoose

See readme for examples and info
@author Jason Raede <jason@torchedm.com>
###


mongoose = require 'mongoose'
require 'mongoose-schema-extend'
dot = require 'dot-component'
_ = require 'underscore'
owl = require 'owl-deepcopy'

###
Added by @watnotte
###
collectionDelimiter = '__'

module.exports = (delimiter) ->
	if delimiter
		collectionDelimiter = delimiter

# Add the mtModel
mongoose.mtModel = (name, schema, collectionName) ->
	precompile = []

	extendPathWithTenantId = (tenantId, path) ->
		if path.instance isnt 'ObjectID' and path.instance isnt mongoose.Schema.Types.ObjectId
			return false
		if !path.options.$tenant? or path.options.$tenant isnt true
			return false


		newPath = 
			type:mongoose.Schema.Types.ObjectId

		for key,val of path.options
			if key isnt 'type'
				newPath[key] = _.clone(val, true)

		newPath.ref = tenantId + collectionDelimiter + path.options.ref

		precompile.push(tenantId + '.' + path.options.ref)
		return newPath

	extendSchemaWithTenantId = (tenantId, schema) ->
		extension = {}
		newSchema = owl.deepCopy(schema)
		# Fix for callQueue arguments, todo: fix clone implementation
		newSchema.callQueue.forEach (k) ->
			args = []
			for key,val of k[1]
				args.push(val)
			k[1] = args

		for prop,config of schema.paths
			if config.options.type instanceof Array
				if config.schema?
					newSubSchema = extendSchemaWithTenantId(tenantId, config.schema)
					newSubSchema = extendSchemaWithTenantId(tenantId, config.schema)
					newSchema.path(prop, [newSubSchema])
				else
					newPath = extendPathWithTenantId(tenantId, config.caster)
					if newPath
						

						newSchema.path(prop, [newPath])
	
			else
				if config.schema?
					newSubSchema = extendSchemaWithTenantId(tenantId, config.schema)
					newSchema.path(prop, newSubSchema)
				else
					newPath = extendPathWithTenantId(tenantId, config)
					if newPath
						newSchema.path(prop, newPath)

		# console.log 'New schema:', newSchema.paths
		return newSchema

	multitenantSchemaPlugin = (schema, options) ->
		schema.statics.getTenantId = schema.methods.getTenantId = ->
			return @schema.$tenantId
		schema.statics.getModel = schema.methods.getModel = (name) ->
			return mongoose.mtModel(@getTenantId() + '.' + name)
		
	# If the name has dot notation, then they want to get that model for that tenant. If it hasn't yet been
	# defined, then create it using the default schema
	
	if name.indexOf('.') >= 0
		parts = name.split('.')

		# In case tenant ID has a "."
		modelName = parts.pop()
		tenantId = parts.join('.')

		tenantModelName = tenantId + collectionDelimiter + modelName
		if mongoose.models[tenantModelName]?
			return mongoose.models[tenantModelName]

		model = @model(modelName);

		tenantCollectionName = tenantId + collectionDelimiter + model.collection.name

		# Otherwise we need to create it
		origSchema = model.schema
		newSchema = extendSchemaWithTenantId(tenantId, origSchema)
		newSchema.$tenantId = tenantId
		newSchema.plugin multitenantSchemaPlugin

		# Since we're doing lazy loading, a model may not have been compiled
		# yet when we need it as a ref. So we need to keep track of all refs
		# that have been modified using the tenant ID prefix and pre-compile
		# them here to avoid that error.
		if mongoose.mtModel.goingToCompile.indexOf(tenantModelName) < 0
			mongoose.mtModel.goingToCompile.push(tenantModelName)
		if precompile.length
			uniq = _.uniq(precompile)
			for pre in uniq
				split = pre.split('.')
				preModelName = split[0] + collectionDelimiter + split[1]
				if !mongoose.models[preModelName]? and mongoose.mtModel.goingToCompile.indexOf(preModelName) < 0
					mongoose.mtModel(pre, null, tenantCollectionName)
		return @model(tenantModelName, newSchema, tenantCollectionName)

	else
		return @model(name, schema, collectionName)



mongoose.mtModel.goingToCompile = []

	
