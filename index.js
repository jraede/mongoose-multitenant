/*
Multi-tenancy for Mongoose

See readme for examples and info
@author Jason Raede <jason@torchedm.com>
*/

var dot, mongoose, _;

mongoose = require('mongoose');

require('mongoose-schema-extend');

dot = require('dot-component');

_ = require('underscore');

mongoose.mtModel = function(name, schema, ignorePrecompile) {
  var extendPathWithTenantId, extendSchemaWithTenantId, modelName, multitenantSchemaPlugin, newSchema, origSchema, parts, pre, precompile, tenantId, tenantModelName, uniq, _i, _len;
  if (ignorePrecompile == null) {
    ignorePrecompile = false;
  }
  precompile = [];
  extendPathWithTenantId = function(tenantId, path) {
    var newPath;
    if (path.instance !== 'ObjectID') {
      return false;
    }
    if ((path.options.$tenant == null) || path.options.$tenant !== true) {
      return false;
    }
    newPath = {
      type: mongoose.Schema.Types.ObjectId,
      ref: tenantId + '__' + path.options.ref
    };
    precompile.push(tenantId + '.' + path.options.ref);
    return newPath;
  };
  extendSchemaWithTenantId = function(tenantId, schema) {
    var config, extension, newPath, newSubSchema, prop, _ref;
    extension = {};
    _ref = schema.paths;
    for (prop in _ref) {
      config = _ref[prop];
      if (config.options.type instanceof Array) {
        if (config.schema != null) {
          newSubSchema = extendSchemaWithTenantId(tenantId, config.schema);
          dot.set(extension, prop, [newSubSchema]);
        } else {
          newPath = extendPathWithTenantId(tenantId, config.caster);
          if (newPath) {
            dot.set(extension, prop, [newPath]);
          }
        }
      } else {
        if (config.schema != null) {
          newSubSchema = extendSchemaWithTenantId(tenantId, config.schema);
          dot.set(extension, prop, newSubSchema);
        } else {
          newPath = extendPathWithTenantId(tenantId, config);
          if (newPath) {
            dot.set(extension, prop, newPath);
          }
        }
      }
    }
    if (_.keys(extension).length > 0) {
      return schema.extend(extension);
    } else {
      return schema;
    }
  };
  multitenantSchemaPlugin = function(schema, options) {
    schema.methods.getTenantId = function() {
      return this.schema.$tenantId;
    };
    return schema.methods.getModel = function(name) {
      return mongoose.model(this.getTenantId() + '__' + name);
    };
  };
  if (name.indexOf('.') >= 0) {
    parts = name.split('.');
    tenantId = parts[0];
    modelName = parts[1];
    tenantModelName = tenantId + '__' + modelName;
    if (mongoose.models[tenantModelName] != null) {
      return mongoose.models[tenantModelName];
    }
    origSchema = this.model(modelName).schema;
    newSchema = extendSchemaWithTenantId(tenantId, origSchema);
    newSchema.$tenantId = tenantId;
    newSchema.plugin(multitenantSchemaPlugin);
    if (precompile.length && !ignorePrecompile) {
      uniq = _.uniq(precompile);
      for (_i = 0, _len = precompile.length; _i < _len; _i++) {
        pre = precompile[_i];
        mongoose.mtModel(pre, null, true);
      }
    }
    return this.model(tenantId + '__' + modelName, newSchema);
  } else {
    return this.model(name, schema);
  }
};
