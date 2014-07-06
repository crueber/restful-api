var should = require("should"),
  request = require("supertest"),
  mongoose = require("mongoose"),
  Schema = mongoose.Schema,
  express = require("express"),
  restful = require("../lib/api"),
  debug = require('debug')('restful-api:debug'),
  _ = require("lodash");

describe("restful-api", function () {
  
  // Build a simple controller
  function buildController(singular, plural, model, strict) {
    debug('finder<' + singular + '>');
    return {
      finder: function(req, identifier, is_index, callback) {
        if (is_index) {
          model.find({}, callback);
        } else {
          if (!!strict) {
            model.findOne({_id: identifier}, function (err, doc) {
              if (err) {
                return callback(err);
              }
              if (!doc) {
                return callback("Not found");
              }
              callback(null, doc);
            });
          } else {
            model.findOne({_id: identifier}, callback);
          }
        }
      },
      index: function(req, res, data) { data(null, req[plural]); },
      read: function(req, res, data) { data(null, req[singular]); },
      create: function(req, res, data) {
        data(null, _.extend({ "_id": mongoose.Types.ObjectId() }, req.body)); 
      },
      update: function(req, res, data) { 
        data(null, req.body);
      },
      remove: function(req, res, data) { 
        data(null, req.body);
      }
    };
  };

  // Build JSON response object
  function buildResponseObject(code, data, message) {
    var response = {
      status: code < 299 ? "Success" : "Failure",
      code: code
    };
    if (typeof data !== "undefined") {
      response.data = data;
    }
    if (typeof message !== "undefined") {
      response.message = message;
    } else if (code >= 400 && code <= 499) {
      response.message = "There was an error that occured."
    }
    return response;
  }
  
  var app, server, rest;
  
  // Common models
  var Userschema = new Schema({
    name: String,
    email: String
  });
  var userModel = mongoose.model('User', Userschema);
  var ProjectSchema = new Schema({
    name: String,
    description: String
  });
  var projectModel = mongoose.model('Project', ProjectSchema);
  var TodoSchema = new Schema({
    name: String
  });
  var todoModel = mongoose.model('Todo', TodoSchema);
  
  // Setup mongo connection before tests
  before(function(done) {
    mongoose.connect('mongodb://localhost/restful-api', function (err) {
      if (err) {
        console.error('MongoDB: ' + err.message);
        console.error('MongoDB is running? Is it accessible by this application?');
        return done(err);
      }
      mongoose.connection.db.dropDatabase(done);
    })
  })

  // And close it afterwards
  after(function (done) {
    mongoose.connection.close(done);
  })

  // Before each test setup a new app and rest object
  beforeEach(function (done) {
    app = express();
    app.use(express.bodyParser());
    rest = restful(app);
    done();
   });

   // After each test listening is stopped. Listening is started in the tests
   afterEach(function (done) {
     server.close();
     done();
   });

  describe("Empty controller { }", function() {
    it("[GET] /users/Should respond 405 - method not allowed", function (done) {
      rest.register_controller('users', { });
      rest.resource('users');
      server = app.listen(3000);
      request(app)
        .get('/users')
        .expect('Content-Type', /json/)
        .expect(405, buildResponseObject(405))
        .end(done);
    });
  });

  describe("Simple operations", function() {
    it("[GET] 200 /users - with an empty set", function (done) {
      rest.register_controller('users', buildController('user', 'users', userModel));
      rest.resource('users');
      server = app.listen(3000);
      request(app)
        .get('/users')
        .expect('Content-Type', /json/)
        .expect(200, buildResponseObject(200, []))
        .end(done);
    });

    it("[GET] 200 /users/:user_id - even though the resource does not exist", function (done) {
      rest.register_controller('users', buildController('user', 'users', userModel));
      rest.resource('users');
      server = app.listen(3000);
      request(app)
        .get('/users/53a317b4f760425203892498')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200, buildResponseObject(200, null))
        .end(done);
    });

    // Not a restful-api feature, but common scenario
    it("[GET] 404 /users/:user_id - when strict", function (done) {
      rest.register_controller('users', buildController('user', 'users', userModel, true));
      rest.resource('users');
      server = app.listen(3000);
      request(app)
        .get('/users/53a317b4f760425203892498')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404, buildResponseObject(404, undefined, "Not found"))
        .end(done);
    });

    it("[POST] 201 /users/, should respond 201 - when created successful", function (done) {
      rest.register_controller('users', buildController('user', 'users', userModel, true));
      rest.resource('users');
      server = app.listen(3000);
      request(app)
        .post('/users/')
        .send({ name: "Joe", email: "joe@example.com" })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)
        .expect(function (res) {
          should.exist(res.body.data);
          should.exist(res.body.data['_id']);
          should.exist(res.body.data['name']);
          should.exist(res.body.data['email']);
        })
        .end(done);
    });
  });
  
  describe("Nested resources", function() {
    it("[GET] 200 /users/:user_id/project - with an empty set", function (done) {
      rest.register_controller('users', buildController('user', 'users', userModel));
      rest.register_controller('projects', buildController('project', 'projects', userModel));
      rest.resource('users');
      rest.resource('users', 'projects');
      server = app.listen(3000);
      request(app)
        .get('/users/53a317b4f760425203892498/projects')
        .expect('Content-Type', /json/)
        .expect(200, buildResponseObject(200, []))
        .end(done);
    });
    
    it("[GET] 200 /users/:user_id/books - resource rename", function (done) {
      rest.register_controller('users', buildController('user', 'users', userModel));
      rest.register_controller('projects', buildController('project', 'projects', userModel));
      rest.resource('users');
      rest.resource('users', 'projects', { projects_resource: 'books' });
      server = app.listen(3000);
      request(app)
        .get('/users/53a317b4f760425203892498/books')
        .expect('Content-Type', /json/)
        .expect(200, buildResponseObject(200, []))
        .end(done);
    });

    it("[GET] 200 /users/:user_id/projects/:project_id/todos - double nesting", function (done) {
      rest.register_controller('users', buildController('user', 'users', userModel));
      rest.register_controller('projects', buildController('project', 'projects', userModel));
      rest.register_controller('todos', buildController('todo', 'todos', todoModel));
      rest.resource('users');
      rest.resource('users', 'projects');
      rest.resource('users', 'projects', 'todos');
      server = app.listen(3000);
      request(app)
        .get('/users/53a317b4f760425203892498/projects/53a317b4f760425203892498/todos')
        .expect('Content-Type', /json/)
        .expect(200, buildResponseObject(200, []))
        .end(done);
    });

    it("[GET] 200 /users/:user_id/books/:book_id/todos - double nesting with rename", function (done) {
      rest.register_controller('users', buildController('user', 'users', userModel));
      rest.register_controller('projects', buildController('project', 'projects', userModel));
      rest.register_controller('todos', buildController('todo', 'todos', todoModel));
      rest.resource('users');
      rest.resource('users', 'projects', { projects_resource: 'books' });
      rest.resource('users', 'projects', 'todos', { projects_resource: 'books', todos_resource: 'tasks' });
      server = app.listen(3000);
      request(app)
        .get('/users/53a317b4f760425203892498/books/53a317b4f760425203892498/tasks')
        .expect('Content-Type', /json/)
        .expect(200, buildResponseObject(200, []))
        .end(done);
    });
  });
});
