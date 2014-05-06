var _       = require('lodash');
var async   = require('async');
var inflect = require('inflect');

var restful_responses = require('./responses')

// options = { controller: 'comments', controller_path ['posts', 'comments'] } // and any other defaults overrides.
// verb can be: index, create, read, update, delete, batch
// order of operations: finder, securer, before filters, action, after filters, response
module.exports = function(verb, req, res, options, defaults, controllers) {
  var is_batch = verb == 'batch'
  var action = undefined
  if (is_batch && req.body['update']) action = options['update'] || defaults['update']
  else if (is_batch && req.body['delete']) action = options['delete'] || defaults['delete']
  else action = options[verb] || defaults[verb] || verb
  var batch_results = []

  var filter = function (filter, callback) { filter(req, res, callback); }

  async.eachSeries(options.controller_path, function (controller_name, callback) {
    var resource = controllers[controller_name]
    var is_last = options.controller_path[options.controller_path.length - 1] == controller_name
    var before_filters = resource['before_filters'] && Array.isArray(resource['before_filters']) ? resource['before_filters'] : [];
    var after_filters = resource['after_filters'] && Array.isArray(resource['after_filters']) ? resource['after_filters'] : [];

    // TODO: Batch needs handling, still. Should run through the whole waterfall for each batch run.

    var waterfall_completion = function (err, callback) {
      if (err && err == 'Unauthorized') return restful_responses.unauthorized(res)
      if (err || !is_last) return callback(err)

      var represent = function (err, data) {
        if (err) return callback(err)
        restful_responses.send_success(res, 200, data)
        async.each(after_filters, filter, callback) 
      }
      var represent_batch = function (err, data) {
        if (err) return callback(err)
        batch_results.push(data)
        async.each(after_filters, filter, callback) 
      }

      resource[action](req, res, is_batch ? represent_batch : represent)
    }
    var waterfall_functions = [
      function do_before_filters (callback) {
        async.eachSeries(before_filters, filter, callback)
      },
      function call_finder (callback) { 
        var finder_function = resource[options['finder'] || defaults['finder']]
        var identifier = req.params[controller_name+'_id'] || req.params['id'] || undefined
        if (finder_function && (verb == 'index' || identifier)) finder_function(req, identifier, (verb == 'index' && is_last), callback)
        else callback(null, undefined)
      },
      function set_model_on_request (models, callback) { 
        if (models && Array.isArray(models)) req[controller_name] = models; 
        else if (models) req[inflect.singularize(controller_name)] = models;
        callback(null); 
      },
      function secure_request (callback) { 
        var secure_function = resource[options['secure'] || defaults['secure']]
        if (secure_function) secure_function(req, !is_last, callback) 
        else callback(null, true)
      },
      function ensure_security (is_secure, callback) { 
        callback(is_secure ? null : "Unauthorized") 
      }
    ]
    if (is_last && is_batch) { 
      var batch_finalize = function (err) {
        if (err) return callback(err)
        restful_responses.send_success(res, 200, batch_results)
        callback()
      }
      if (req.body['update']) {
        var updates = req.body['update']
        var keys = Object.keys(updates)
        async.eachSeries(keys, function (key, cb) {
          req.params['id'] = key
          req.body = updates[key]
          async.waterfall(waterfall_functions, function (err) { waterfall_completion(err, cb) })
        }, batch_finalize)
      }
      else if (req.body['delete']) {
        async.eachSeries(req.body['delete'], function (ident, cb) {
          req.params['id'] = ident
          async.waterfall(waterfall_functions, function (err) { waterfall_completion(err, cb) })
        }, batch_finalize)
      }
      else if (req.body['create']) {
        create_list = req.body['create']
        async.eachSeries(create_list, function (to_be_created, cb) {
          req.body = to_be_created
          async.waterfall(waterfall_functions, function (err) { waterfall_completion(err, cb) })
        }, batch_finalize)
      }
    }
    else async.waterfall(waterfall_functions, function (err) { waterfall_completion(err, callback) });
  }, function series_callback (err) {
    if (err) return restful_responses.send_error(res, 404, err)
  })
}
