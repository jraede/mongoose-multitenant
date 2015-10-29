/*
Multi-tenancy for Mongoose

See readme for examples and info
@author Jason Raede <jason@torchedm.com>
*/

var dot, mongoose, owl, _;

mongoose = require('mongoose');

dot = require('dot-component');

_ = require('underscore');

owl = require('owl-deepcopy');

/*
Added by @watnotte
*/


module.exports = {
  collectionDelimiter: '__',
  connection: mongoose,
  setup: function() {
    var collectionDelimiter, connection, self;
    self = this;
    if (arguments.length === 1 && arguments[0]) {
      if (_.isString(arguments[0])) {
        this.collectionDelimiter = arguments[0];
      } else {
        this.connection = arguments[0];
      }
    }
    if (arguments.length === 2) {
      if (arguments[0] && _.isString(arguments[0])) {
        this.collectionDelimiter = arguments[0];
      } else if (arguments[0]) {
        this.connection = arguments[0];
      }
      if (arguments[1] && _.isString(arguments[1])) {
        this.collectionDelimiter = arguments[1];
      } else if (arguments[1]) {
        this.connection = arguments[1];
      }
    }
    connection = this.connection;
    collectionDelimiter = this.collectionDelimiter;
    connection.mtModel = function(name, schema, collectionName) {
      var args, extendPathWithTenantId, extendSchemaWithTenantId, make, modelName, multitenantSchemaPlugin, parts, precompile, tenantId, tenants;
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
        newPath.ref = tenantId + collectionDelimiter + path.options.ref;
        precompile.push(tenantId + '.' + path.options.ref);
        return newPath;
      };
      extendSchemaWithTenantId = function(tenantId, schema) {
        var config, extension, newPath, newSchema, newSubSchema, prop, _ref;
        extension = {};
        newSchema = owl.deepCopy(schema);
        newSchema.callQueue.forEach(function(k) {
          var args, key, val, _ref, _results;
          args = [];
          _ref = k[1];
          _results = [];
          for (key in _ref) {
            val = _ref[key];
            args.push(val);
            _results.push(k[1] = args);
          }
          return _results;
        });
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
        schema.statics.getTenantId = schema.methods.getTenantId = function() {
          return this.schema.$tenantId;
        };
        return schema.statics.getModel = schema.methods.getModel = function(name) {
          return connection.mtModel(this.getTenantId() + '.' + name);
        };
      };
      make = function(tenantId, modelName) {
        var model, newSchema, origSchema, pre, preModelName, tenantCollectionName, tenantModelName, uniq, _i, _len;
        console.log('making %s for %s', modelName, tenantId);
        if (connection.mtModel.tenants.indexOf(tenantId) === -1) {
          console.log('adding %s', tenantId);
          connection.mtModel.tenants.push(tenantId);
        }
        tenantModelName = tenantId + collectionDelimiter + modelName;
        if (connection.models[tenantModelName] != null) {
          return connection.models[tenantModelName];
        }
        model = this.model(modelName);
        tenantCollectionName = tenantId + collectionDelimiter + model.collection.name;
        origSchema = model.schema;
        newSchema = extendSchemaWithTenantId(tenantId, origSchema);
        newSchema.$tenantId = tenantId;
        newSchema.plugin(multitenantSchemaPlugin);
        if (connection.mtModel.goingToCompile.indexOf(tenantModelName) < 0) {
          connection.mtModel.goingToCompile.push(tenantModelName);
        }
        if (precompile.length) {
          uniq = _.uniq(precompile);
          for (_i = 0, _len = uniq.length; _i < _len; _i++) {
            pre = uniq[_i];
            pre = pre.slice(tenantId.length + 1);
            preModelName = tenantId + collectionDelimiter + pre;
            if ((connection.models[preModelName] == null) && mongoose.mtModel.goingToCompile.indexOf(preModelName) < 0) {
              connection.mtModel(tenantId, pre);
            }
          }
        }
        return this.model(tenantModelName, newSchema, tenantCollectionName);
      };
      if (arguments.length === 1) {
        tenants = _.sortBy(connection.mtModel.tenants, function(tenant) {
          return tenant.length;
        });
        tenants.reverse();
        args = arguments;
        tenantId = _.find(tenants, function(tenant) {
          return new RegExp('^' + tenant + '.').test(args[0]);
        });
        if (!tenantId) {
          parts = arguments[0].split('.');
          modelName = parts.pop();
          tenantId = parts.join('.');
        } else {
          modelName = arguments[0].slice(tenantId.length + 1);
        }
        return make.call(this, tenantId, modelName);
      } else if (arguments.length === 2) {
        if (arguments[1] instanceof mongoose.Schema) {
          return this.model(arguments[0], arguments[1]);
        } else {
          return make.call(this, arguments[0], arguments[1]);
        }
      } else if (arguments.length === 3) {
        return this.model(arguments[0], arguments[1], arguments[2]);
      } else {
        throw new Error('invalid arguments');
      }
    };
    connection.mtModel.goingToCompile = [];
    connection.mtModel.tenants = [];
    return connection.mtModel.addTenant = function(tenantId) {
      console.log('adding tenant %s', tenantId);
      return connection.mtModel.tenants.push(tenantId);
    };
  }
};
