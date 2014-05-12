var _     = require('lodash')
var async = require('async')

var restful_responses = require('./responses')
var be_restful = require('./be_restful')

module.exports = function (express_app, overriden_defaults) {
  var defaults = _.merge(require('./defaults'), overriden_defaults)
  var controllers = {}; // <name, controller> pairs of controllers. Eg. { 'posts': PostsController, 'comments', CommentsController }

  var attach_to_express = function (http_verb, crud_verb, pathing, controller, options) {
    express_app[http_verb](pathing, function (req, res) {
      if (controller[options[crud_verb]] || controller[defaults[crud_verb]] || controller[crud_verb] || crud_verb == 'batch')
        return be_restful(crud_verb, req, res, options, defaults, controllers)
      restful_responses.method_not_allowed(res)
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
    var args = Array.prototype.slice.call(arguments)
    var options = {}
    if (typeof args[args.length - 1] == 'object') options = args.pop()
    options = _.defaults(options, defaults)

    options.controller_path = []
    var base_path = options['prefix']
    var controller = controllers[args[args.length - 1]]
    
    _.each(args, function (arg, idx, args) {
      if (idx < args.length - 1) base_path = base_path+arg+'/:'+arg+'_id/'
      else base_path += options[arg+'_resource'] || arg
      options.controller_path.push(arg)
    })
    var base_path_with_id = base_path + '/:id'
    var batch_path        = base_path + '/batch'
    
    attach_to_express('get'   , 'index' , base_path,         controller, options)
    attach_to_express('post'  , 'create', base_path,         controller, options)
    attach_to_express('get'   , 'read'  , base_path_with_id, controller, options)
    attach_to_express('put'   , 'update', base_path_with_id, controller, options)
    attach_to_express('delete', 'delete', base_path_with_id, controller, options)
    attach_to_express('post'  , 'batch' , batch_path,        controller, options)
    _.each(options.individual_actions, function (i) { 
      attach_to_express(i.http_verb, i.controller_action, base_path_with_id+'/'+i.controller_action, controller, options) 
    })
    _.each(options.list_actions, function (i) { 
      attach_to_express(i.http_verb, i.controller_action, base_path+'/'+i.controller_action, controller, options) 
    })
    options.logger.debug("RESTful API: Resource mounted at "+base_path)
  }

  return this;
}
