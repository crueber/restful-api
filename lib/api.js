var _ = require('lodash')
var async = require('async')

var restful_responses = require('./responses')

module.exports = function (express_app, overriden_defaults) {
  var defaults = _.merge(require('./defaults'), overriden_defaults)
  var controllers = {}; // <name, controller> pairs of controllers. Eg. { 'posts': PostsController, 'comments', CommentsController }

  // options = { controller: 'comments', controller_path ['posts', 'comments'] } // and any other defaults overrides.
  // verb can be: index, create, read, update, delete, batch
  // order of operations: finder, securer, before filters, action, after filters, response
  var restful = function(verb, req, res, options) {
    var controller_name = options['controller']
    var action = options[verb] || defaults[verb]
    var resource = controllers[controller_name]

    var filter = function (filter, callback) { filter(req, res, callback); }
    var represent = function (err, data) {
      if (err) return restful_responses.send_error(res, 400, err)
      restful_responses.send_success(res, 200, data)
    }

    async.eachSeries(options.controller_path, function (controller_name, callback) {
      var resource = controllers[controller_name]
      var is_last = options.controller_path[options.controller_path.length - 1] == controller_name

      async.waterfall([
        function call_finder (callback) { 
          var finder_function = resource[options['finder'] || defaults['finder']]
          if (finder_function) finder_function(req.params[controller_name+'_id'] || req.params['id'], (verb == 'index' && is_last), callback)
          else callback(null, undefined)
        },
        function set_model_on_request (models, callback) { 
          if (models) req[controller_name] = models; 
          callback(null); 
        },
        function secure_request (callback) { 
          var secure_function = resource[options['secure'] || defaults['secure']]
          if (secure_function) secure_function(req, callback) 
          else callback(null, true)
        },
        function ensure_security (is_secure, callback) { 
          callback(is_secure ? null : "Unauthorized") 
        }
      ], callback);
    }, function run_destination_action (err) {
      if (err && err == 'Unauthorized') return restful_responses.unauthorized(res)

      async.waterfall([
        function call_before_filters (callback) { 
          if (resource['before_filters'] && Array.isArray(resource['before_filters'])) async.eachSeries(resource.before_filters, filter, callback) 
          else callback(null)
        },
        function do_action (callback) { resource[action](req, res, represent); callback(); }
      ],
      function after_filters_and_finalize(err) {
        async.each(resource.after_filters || [], filter, function finalize(err) {}) // TODO: need to do something with the error.      
      })
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
    var base_path = '/'
    var last_arg = arguments[arguments.length - 1]
    var options = typeof last_arg == 'object' ? last_arg : { controller: last_arg }
    options.controller_path = []
    var controller = controllers[options.controller]
    
    _.each(arguments, function (arg, idx, args) {
      if (typeof arg === 'string') {
        if (idx < args.length - 1) base_path = base_path+arg+'/:'+arg+'_id/'
        else base_path += arg
        // base_path += arg
        // if (args.length - 2 != idx) base_path += "/:"+base_path+"_id"
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

