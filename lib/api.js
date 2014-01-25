var _ = require('lodash')
var async = require('async')

module.exports = function (express_app, overriden_defaults) {
  var defaults = _.merge(require('./defaults'), overriden_defaults)
  var controllers = {}; // <name, controller> pairs of controllers. Eg. { 'posts': PostsController, 'comments', CommentsController }

  var send_error = function (res, code, msg) {
    var error = { status: 'Error', message: 'There was an error that occured.'}
    if (typeof code === 'number' && (code < 400 || code > 599)) code = 400
    if (typeof code === 'string') { msg = code; code = 400; }
    if (global.logger && global.logger.error ) { global.logger.error(msg) }
    res.status(code).json(error)
  }

  // options = { controller: 'comments', controller_path ['posts', 'comments'] } // and any other defaults overrides.
  // verb can be: index, create, read, update, delete, bulk
  var restful = function(verb, req, res, options) {
    var controller_name = options[controller]
    var action = options[verb] || defaults[verb]
    var resource = controllers[controller_name]

    var filter = function (filter, callback) { filter(req, res, callback); }
    var represent = function (err, data) {
      if (err) return send_error(res, 400, err)

      async.each(resource.after_filters || [], filter, function finalize(err) {
        if (err) return send_error(res, 400, err)

        res.status(200).send(JSON.stringify(data))
      })
    }

    async.each(resource.before_filters || [], filter, function (err) {
      if (err) return send_error(res, 400, err)
        
      resource[action](req, res, represent)
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
    var base_path = ''
    var last_arg = arguments[arguments.length - 1]
    var options = typeof last_arg === 'object' ? arguments[arguments.length - 1] : { controller: last_arg }
    options.controller_path = []
    var controller = controller[options.controller]
    
    _.each(arguments, function (arg, idx, args) {
      if (typeof arg === 'string') {
        base_path += arg
        if (args.length - 2 != idx) base_path += "/:"+base_path+"_id/"
        options.controller_path.push(arg)
      }
    })
    var base_path_with_id = base_path + '/:id'

    if (controller[options['index']] || controller[defaults['index']]) {
      var proxy_index = function (req, res) { restful('index', req, res, options) }
      express_app.get(base_path, proxy_index)
    }

    if (controller[options['read']] || controller[defaults['read']]) {
      var proxy_read   = function (req, res) { restful('read', req, res, options) }
      express_app.get(base_path_with_id, proxy_read)
    }

    if (controller[options['create']] || controller[defaults['create']]) {
      var proxy_create = function (req, res) { restful('create', req, res, options) }
      express_app.post(base_path, proxy_create)
    }

    if (controller[options['update']] || controller[defaults['update']]) {
      var proxy_update = function (req, res) { restful('update', req, res, options) }
      express_app.post(base_path_with_id + '/update', proxy_update)
      express_app.put(base_path_with_id, proxy_update)
    }

    if (controller[options['delete']] || controller[defaults['delete']]) {
      var proxy_delete = function (req, res) { restful('delete', req, res, options) }
      express_app.post(base_path_with_id + '/delete', proxy_delete)
      express_app.delete(base_with_with_id, proxy_delete)
    }

    if (controller[options['bulk']] || controller[defaults['bulk']]) {
      var proxy_bulk   = function (req, res) { restful('bulk', req, res, options) }
      express_app.post(base_path, proxy_bulk)
    }
  }
}

