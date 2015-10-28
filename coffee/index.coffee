###
Multi-tenancy for Mongoose

See readme for examples and info
@author Jason Raede <jason@torchedm.com>
###


mongoose = require 'mongoose'
dot = require 'dot-component'
_ = require 'underscore'
owl = require 'owl-deepcopy'

###
Added by @watnotte
###

module.exports = 
	collectionDelimiter: '__',
	connection: mongoose,
	setup: () ->
		if arguments.length == 1 and arguments[0]
			if _.isString(arguments[0])
				@collectionDelimiter = arguments[0]
			else
				@connection = arguments[0]
		
		if arguments.length == 2
			if arguments[0] and _.isString(arguments[0])
				@collectionDelimiter = arguments[0]
			else if arguments[0]
				@connection = arguments[0]

			if arguments[1] and _.isString(arguments[1])
				@collectionDelimiter = arguments[1]
			else if arguments[1]
				@connection = arguments[1]

		connection = @connection
		collectionDelimiter = @collectionDelimiter
		# Add the mtModel
		connection.mtModel = (name, schema, collectionName) ->
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
					return connection.mtModel(@getTenantId() + '.' + name)
			
			make = (tenantId, modelName) ->
				tenantModelName = tenantId + collectionDelimiter + modelName
				if connection.models[tenantModelName]?
					return connection.models[tenantModelName]

				model = @model(modelName)

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
				if connection.mtModel.goingToCompile.indexOf(tenantModelName) < 0
					connection.mtModel.goingToCompile.push(tenantModelName)
				if precompile.length
					uniq = _.uniq(precompile)
					for pre in uniq
						pre = pre.slice(tenantId.length+1)
						preModelName = tenantId + collectionDelimiter + pre
						if !connection.models[preModelName]? and mongoose.mtModel.goingToCompile.indexOf(preModelName) < 0
							connection.mtModel(tenantId, pre)
				return @model(tenantModelName, newSchema, tenantCollectionName)
				
			if arguments.length == 1
				# If the name has dot notation, then they want to get that model for that tenant. If it hasn't yet been
				# defined, then create it using the default schema
				parts = arguments[0].split('.')
				modelName = parts.pop()
				tenantId = parts.join('.')
				make.call(this, tenantId, modelName)
			else if arguments.length == 2
				# if the second argument is a mongoose schema, treat as a plain old mongoose model
				# otherwise, the tenant and collection are explicitly passed
				if arguments[1] instanceof mongoose.Schema
					return @model(arguments[0], arguments[1])
				else
					return make.call(this, arguments[0], arguments[1])
			else if aguments.length == 3
				# plain old mongoose model
				return @model(arguments[0], arguments[1], arguments[2])
			else
				throw new Error('invalid arguments')

		connection.mtModel.goingToCompile = []
