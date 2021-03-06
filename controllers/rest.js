var Document = require('../models/document.js')
  , System = require('../models/system.js') 
  , util = require('./util.js')
  , sUtil = require('substance-util')
  , _ = require('underscore');

module.exports = function(schema, options) {
  options = options || {};


  /** 
   * Creates record from JSON
   *
   * @param {string} data - JSON represenation of new record
   * @param {string} user - JSON represenation of user record
   * @param {callback} cb - The callback that handles the results 
   */

  schema.statics.add = function(data, user, cb) {
    var self = this;

    data.edited = user._id;
    data.created = user._id;

    new self(data).save(function(err, record) {
      if (err) return cb(err);
      cb(err, record);
    })
  }

  /** 
   * Updates record unique JSON
   *
   * @param {string} id - The unique id of target record
   * @param {string} data - JSON with updated properties
   * @param {string} user - JSON represenation of user record
   * @param {callback} cb - The callback that handles the results 
   */

  schema.statics.change = function(id, data, user, cb) {
    var self = this;

    data.edited = user._id;
    data.updatedAt = new Date;

    delete data.__v;
    self.findByIdAndUpdate(id, { $set: data }, { upsert: true, new: true }, function (err, record) {
      if (err) return err;
      self.incrementDBVersion(function(err) {
        cb(err, record);
      });
    });
  }

  /** 
   * Gets record by unique id 
   *
   * @param {string} id - The unique id of target record
   * @param {callback} cb - The callback that handles the results 
   */

  schema.statics.get = function(id, cb) {
    this.findById(id, function(err, record) {
      cb(err, record);
    });
  }

  /** 
   * List records
   *
   * @param {string} opt - The query options from request
   * @param {callback} cb - The callback that handles the results 
   */

  schema.statics.list = function(opt, cb) {
    var self = this,
        query = util.getQuery(opt.query),
        options = util.getOptions(opt);

    self.count(query, function(err, counter) {
      if (err) return cb(err);
      self
        .find(query, null, options)
        .populate('edited', 'name')
        .exec(function(err, records) {
          cb(err, [{total_entries: counter}, records]);
        });
    });
  }

  /** 
   * Removes record by unique id 
   *
   * @param {string} id - The unique id of target record
   * @param {callback} cb - The callback that handles the results 
   */

  schema.statics.delete = function(id, cb) {
    var self = this;
    // Unsave op (needs to be wrapped in a transaction)
    this.propagateChange(id, {mode: "delete"}, function(err) {
      if (err) return cb(err);
      self.findByIdAndRemove(id, function (err) {
        if (err) return cb(err);
        self.incrementDBVersion(cb);
      });
    });
  };

  /** 
   * Updates references in a document, either removing them or replacing them with a new id
   *
   * @param {string} docId - Substance document as JSON
   * @param {string} id - entity to be updated
   * @param {object} options - mode = delete|replace, replace mode has entityId
   */
   
  schema.statics.updateForDoc = function(docId, id, opt, cb) {
    Document.get(docId, function(err, doc) {
      if (err) return cb(err);

      console.log("docid;", docId, "referenceId", id, "options", opt);
      var subjectReferences = [];
      var hasChanged = false;
      _.each(doc.nodes, function(node) {

        if (node.type === options.referenceType) {

          if (_.isArray(node.target)) {
           console.log('node.target#before', node.id, node.target);
            // Skip nodes subject refs that don't have targets
            if (!node.target) return;
            var pos = node.target.indexOf(id);
            if (pos > -1) {
              if (opt.mode === "delete") {
                node.target.splice(pos, 1);
              } else {
                node.target[pos] = opt.newReferenceId;
                node.target = _.uniq(node.target);
              }
              hasChanged = true;
            }
            console.log('node.target#after', node.id, node.target)
          } else {
            console.log(id, node.target)
            if (id === node.target) {
              hasChanged = true;
              if (opt.mode === "delete") {
                delete doc.nodes[node.id];
              } else {
                node.target = opt.newReferenceId;
              }
            }
          }
        }
      });

      if (hasChanged) {
        var user = {name: 'Archivist'}
        Document.change(docId, doc, user, function(err) {
          cb(err);
        });
      } else {
        console.log(docId, 'did not change... move along');
        cb(null);
      }
    });
  }

  /** 
   * Updates references in a document, either removing them or replacing them with a new id
   *
   * @param {string} data - entity to be updated
   * @param {object} options - mode = delete|replace, replace mode has newId
   */
   
  schema.statics.propagateChange = function(id, opt, cb) {
    var self = this;

    Document.find({}, 'id', {}, function(err, documents) {
      sUtil.async.each({
        items: documents,
        iterator: function(doc, cb) {
          self.updateForDoc(doc._id, id, opt, cb);
        }
      }, function(err) {
        console.log('done with everything yay!');
        cb(err);
      });
    });
  };

  /**
   * Increment entity db version variable
   *
   * @param {callback} cb - The callback that handles the results 
   */

  schema.statics.incrementDBVersion = function(cb) {
    System.findOneAndUpdate({name: options.systemCounter}, { $inc: {'version': 1 }}, {new: true, upsert: true}, function(err, variable) {
      cb(err, variable);
    });
  };

  /**
   * Get entity db version variable
   *
   * @param {callback} cb - The callback that handles the results 
   */

  schema.statics.getDBVersion = function(cb) {
    System.findOne({name: options.systemCounter}, function(err, variable) {
      if (err) return err;
      cb(err, variable.get('version'));
    });
  };
}