###
Multi-tenancy for Mongoose

See readme for examples and info
@author Jason Raede <jason@torchedm.com>
###


mongoose = require 'mongoose'
require 'mongoose-schema-extend'
dot = require 'dot-component'
_ = require 'underscore'
# Add the mtModel
mongoose.mtModel = (name, schema) ->

	extendPathWithTenantId = (tenantId, path) ->

		if path.instance isnt 'ObjectID'
			return false
		if !path.options.$tenant? or path.options.$tenant isnt true
			return false

		newPath = 
			type:mongoose.Schema.Types.ObjectId
			ref:tenantId + '__' + path.options.ref
		return newPath

	extendSchemaWithTenantId = (tenantId, schema) ->
		extension = {}

		for prop,config of schema.paths
			
			if config.options.type instanceof Array
				if config.schema?
					newSubSchema = extendSchemaWithTenantId(tenantId, config.schema)
					dot.set extension, prop, [newSubSchema]
				else
					newPath = extendPathWithTenantId(tenantId, config.caster)
					if newPath
						

						dot.set extension, prop, [newPath]
	
			else
				if config.schema?
					newSubSchema = extendSchemaWithTenantId(tenantId, config.schema)
					dot.set extension, prop, newSubSchema
				else
					newPath = extendPathWithTenantId(tenantId, config)
					if newPath
						dot.set extension, prop, newPath



		if _.keys(extension).length > 0
			return schema.extend(extension)
		else
			return schema

	multitenantSchemaPlugin = (schema, options) ->
		schema.methods.getTenantId = ->
			return @schema.$tenantId
		schema.methods.getModel = (name) ->
			return mongoose.model(@getTenantId() + '__' + name)
		
	# If the name has dot notation, then they want to get that model for that tenant. If it hasn't yet been
	# defined, then create it using the default schema
	
	if name.indexOf('.') >= 0
		parts = name.split('.')
		tenantId = parts[0]
		modelName = parts[1]

		tenantModelName = tenantId + '__' + modelName
		if @models[tenantModelName]?
			return @models[tenantModelName]

		# Otherwise we need to create it
		origSchema = @model(modelName).schema
		newSchema = extendSchemaWithTenantId(tenantId, origSchema)
		newSchema.$tenantId = tenantId
		newSchema.plugin multitenantSchemaPlugin


		return @model(tenantId + '__' + modelName, newSchema)

	else
		return @model(name, schema)





	
