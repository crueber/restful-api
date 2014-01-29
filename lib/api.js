var _     = require('lodash')
var async = require('async')

var restful_responses = require('./responses')

module.exports = function (express_app, overriden_defaults) {
  var defaults = _.merge(require('./defaults'), overriden_defaults)
  var controllers = {}; // <name, controller> pairs of controllers. Eg. { 'posts': PostsController, 'comments', CommentsController }

  // options = { controller: 'comments', controller_path ['posts', 'comments'] } // and any other defaults overrides.
  // verb can be: index, create, read, update, delete, batch
  // order of operations: finder, securer, before filters, action, after filters, response
  var restful = function(verb, req, res, options) {
    var action = options[verb] || defaults[verb]
    var is_batch = verb == 'batch'
    var batch_results = []

    var filter = function (filter, callback) { filter(req, res, callback); }
    var represent = function (err, data) {
      if (err) return restful_responses.send_error(res, 400, err)
      restful_responses.send_success(res, 200, data)
    }
    var represent_batch = function (err, data) {
      if (err) return restful_responses.send_error(res, 400, err)
        batch_results.push(data)
    }

    async.eachSeries(options.controller_path, function (controller_name, callback) {
      var resource = controllers[controller_name]
      var is_last = options.controller_path[options.controller_path.length - 1] == controller_name
      var before_filters = resource['before_filters'] && Array.isArray(resource['before_filters']) ? resource['before_filters'] : [];
      var after_filters = resource['after_filters'] && Array.isArray(resource['after_filters']) ? resource['after_filters'] : [];

      // TODO: Batch needs handling, still. Should run through the whole waterfall for each batch run.
      // TODO: before_filters[] still need testing.
      // TODO: after_filters[] still need testing.

      var waterfall_completion = function (err) {
        if (err && err == 'Unauthorized') return restful_responses.unauthorized(res)
        if (err) return restful_responses.unknown(res)

        async.eachSeries(before_filters, filter, function (err) {
          if (err) return restful_responses.send_error(res, 404, err)
          resource[action](req, res, is_batch ? represent_batch : represent)

          async.each(after_filters, filter, function finalize(err) {}) 
        }) 
      }
      var waterfall_functions = [
        function call_finder (callback) { 
          var finder_function = resource[options['finder'] || defaults['finder']]
          var identifier = req.params[controller_name+'_id'] || req.params['id'] || undefined
          if (finder_function && identifier) finder_function(identifier, (verb == 'index' && is_last), callback)
          else callback(null, undefined)
        },
        function set_model_on_request (models, callback) { 
          if (models) req[controller_name] = models; 
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
      async.waterfall(waterfall_functions, waterfall_completion);
    }, function series_callback (err) {
      console.log('It should not be possible to reach here. Contact the maintainer.')
    })
  }

  // Must be called with all controllers to be used by the restful-api.resource.
  this.register_controller = function (name, object) { 
    if (typeof name === 'object') {
      controllers = _.merge(controllers, name)
    } else {
      controllers[name] = object  
    }
  }

  // Function signature intentionally left blank. Need to iterate over all arguments.
  this.resource = function () {
    var last_arg = arguments[arguments.length - 1]
    var options = typeof last_arg == 'object' ? last_arg : {}

    options.controller_path = []
    var base_path = defaults['prefix']
    var controller = controllers[typeof last_arg == 'object' ? arguments[arguments.length - 2] : last_arg]
    
    _.each(arguments, function (arg, idx, args) {
      if (typeof arg === 'string') {
        if (idx < args.length - 1) base_path = base_path+arg+'/:'+arg+'_id/'
        else base_path += arg
        options.controller_path.push(arg)
      }
    })
    var base_path_with_id = base_path + '/:id'
    express_app.all(base_path, function base_path_proxy(req, res) {
      var method = req.method.toLowerCase()
      if (method == 'get' && (controller[options['index']] || controller[defaults['index']])) return restful('index', req, res, options)
      else if (method == 'post' && (controller[options['create']] || controller[defaults['create']])) return restful('create', req, res, options)
      else restful_responses.method_not_allowed(res)
    })
    express_app.all(base_path_with_id, function base_path_with_id_proxy(req, res) {
      var method = req.method.toLowerCase()
      if (method == 'get' && (controller[options['read']] || controller[defaults['read']])) return restful('read', req, res, options)
      else if (method == 'put' && (controller[options['update']] || controller[defaults['update']])) return restful('update', req, res, options)
      else if (method == 'delete' && (controller[options['delete']] || controller[defaults['delete']])) return restful('delete', req, res, options)
      else restful_responses.method_not_allowed(res)
    })
    express_app.post(base_path+'/batch', function (req, res) { 
      if (req.query.method && controller[options['batch']] || controller[defaults['batch']]) return restful('batch', req, res, options) 
      else restful_responses.method_not_allowed(res)
    })
    // express_app.post(base_path_with_id + '/update', proxy_update)
    // express_app.post(base_path_with_id + '/delete', proxy_delete)
  }

  return this;
}

