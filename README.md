# RESTful API

## What is this thing?

REST. It's not just a bunch of letters and a vague way to get things done. It stands for REpresentational State Transfer. Over HTTP, that means specific verbs match to specific nouns. Luckily, we have an easy time of this over HTTP, because we already have HTTP verbs, and a URI in which we can easily define our nouns. Additionally, the results of these resources should be representable in multiple different formats (JSON and XML at a minimum). 

#### Limitations

* Express. Most apps in Node utilize Express, and this library is no different. I have some vague notion of expanding this libraries usefulness beyond Express, but for now, that's where it lives.
* That's it! You define your security model, you can use whatever databases you're currently using; You just have to follow some basic patterns in order to get started.

## Why did I do this?

I saw an awful lot of people taking a shot at this particular problem with different node modules, but not a single one was easy to use or understand. Not only that, but some of them actually got REST wrong! I wanted an easier way to..

1. Write (and read) routing for my Node applications.
2. Simplify writing APIs for Node.
3. Usable before and after filters defined for my resources.
4. Easily allow for multiple representations of my resources.

## Getting Started

### Step 1: Set up restful-api

Pull in the library and save it.

    npm install restful-api --save

### Step 2: Initialize restful-api

First you have to require the restful-api, at some point after your express initialization.

    rest = require('rest')(app)

### Step 3: Register your controllers

    rest.register_controller('posts', PostsController)
      - or -
    rest.register_controller({ 'posts': PostsController, 'comments': CommentsController })

### Step 4: Register your resources individually (they can be nested!).

    rest.resource('posts')              // <-- Produces /posts pathing!
    rest.resource('posts', 'comments')  // <-- Produces /posts/:post_id/comments pathing! ..hang tight for more info on this.

### Step 5: Start building your controllers in this fashion!

    module.exports = {
      finder: function (params, is_index, callback) {}, // callback accepts error and the array/object needed for this resource (and any others that are nested).
      secure: function (req, callback) {},              // callback accepts error and a boolean for whether or not the user is authorized.
      before_filters: [ function (req, res, callback) ], // filters that are run before the resource function.
      after_filters: [ function (req, res, callback) ],  // filters that are run after the resource function, and after the response has been sent.
      
      index: function (req, res, data) {},  // data is a callback that accepts error and an array of serializable objects. Each object must contain an 'id' property.
      read: function (req, res, data) {},   // data is a callback that accepts error and a serializable object. Must contain on 'id' property.
      create: function (req, res, data) {}, // data is a callback that takes error and a serializable version of the created resource. Must contain an 'id' property.
      update: function (req, res, data) {}, // data is a callback that takes error and a serializable version of the updated resource. Must contain an 'id' property.
      remove: function (req, res, success) {}, // success is a callback that takes error and a boolean to indicate the success of the deletion.
    }

# Miscellany information that is useful during the initial building phase...

// # Index: GET /posts, 
// # (C)reate: POST /posts, 
// # (R)ead: GET /posts/:id
// # (U)pdate: PUT /posts/:id, POST /posts/:id/update
// # (D)elete: DELETE /posts, POST /posts/:id/delete
// # Bulk: POST /posts/bulk?method=delete body: [id, id, id]
// # Bulk: POST /posts/bulk?method=update body: {id: {}, id: {}}
// # GET /posts[.json] => {posts: [{id: '1', name: 'balh', content: 'lorem ipsum...'}, {}]}
// # GET /posts/1[.json] => {posts: [{id: '1', name: 'balh', content: 'lorem ipsum...'}]}
// # GET /posts/1/comments[.json] => {comments: [{}, {}]}
// # GET /posts/1/comments?parents=true => {posts: [{}], comments: [{}, {}]}

// CommentController =
//   index: (req, res, data) -> # req = {post: PostModel, comment: [CommentModel, CommentModel]}
