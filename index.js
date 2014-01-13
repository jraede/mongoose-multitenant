/*
Multi-tenancy for Mongoose

See readme for examples and info
@author Jason Raede <jason@torchedm.com>
*/

var dot, mongoose, owl, _;

mongoose = require('mongoose');

require('mongoose-schema-extend');

dot = require('dot-component');

_ = require('underscore');

owl = require('owl-deepcopy');

mongoose.mtModel = function(name, schema, ignorePrecompile) {
  var extendPathWithTenantId, extendSchemaWithTenantId, modelName, multitenantSchemaPlugin, newSchema, origSchema, parts, pre, precompile, tenantId, tenantModelName, uniq, _i, _len;
  if (ignorePrecompile == null) {
    ignorePrecompile = false;
  }
  precompile = [];
  extendPathWithTenantId = function(tenantId, path) {
    var key, newPath, val, _ref;
    if (path.instance !== 'ObjectID' && path.instance !== mongoose.Schema.Types.ObjectId) {
      return false;
    }
    if ((path.options.$tenant == null) || path.options.$tenant !== true) {
      return false;
    }
    newPath = {
      type: mongoose.Schema.Types.ObjectId
    };
    _ref = path.options;
    for (key in _ref) {
      val = _ref[key];
      if (key !== 'type') {
        newPath[key] = _.clone(val, true);
      }
    }
    newPath.ref = tenantId + '__' + path.options.ref;
    precompile.push(tenantId + '.' + path.options.ref);
    return newPath;
  };
  extendSchemaWithTenantId = function(tenantId, schema) {
    var config, extension, newPath, newSchema, newSubSchema, prop, _ref;
    extension = {};
    newSchema = owl.deepCopy(schema);
    _ref = schema.paths;
    for (prop in _ref) {
      config = _ref[prop];
      if (config.options.type instanceof Array) {
        if (config.schema != null) {
          newSubSchema = extendSchemaWithTenantId(tenantId, config.schema);
          newSubSchema = extendSchemaWithTenantId(tenantId, config.schema);
          newSchema.path(prop, [newSubSchema]);
        } else {
          newPath = extendPathWithTenantId(tenantId, config.caster);
          if (newPath) {
            newSchema.path(prop, [newPath]);
          }
        }
      } else {
        if (config.schema != null) {
          newSubSchema = extendSchemaWithTenantId(tenantId, config.schema);
          newSchema.path(prop, newSubSchema);
        } else {
          newPath = extendPathWithTenantId(tenantId, config);
          if (newPath) {
            newSchema.path(prop, newPath);
          }
        }
      }
    }
    return newSchema;
  };
  multitenantSchemaPlugin = function(schema, options) {
    schema.methods.getTenantId = function() {
      return this.schema.$tenantId;
    };
    return schema.methods.getModel = function(name) {
      return mongoose.mtModel(this.getTenantId() + '.' + name);
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
