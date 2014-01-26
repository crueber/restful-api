# **ß** ALERT ** ALERT ** ALERT ****

THIS LIBRARY IS UNDER INITIAL CONSTRUCTION! IT DOES NOT CURRENTLY WORK AND IS NOT CURRENTLY IN NPM!  STAY TUNED!

# RESTful API

## What is this thing?

REST. It's not just a bunch of letters and a vague way to get things done. It stands for REpresentational State Transfer. Luckily, over HTTP, we have an easy place for both the verbs and nouns of REST! Each request issued to a server already contains both things, all you have to do is start structuring it in a conventional pattern. Additionally, the results of these resources should be representable in multiple different formats (JSON and XML at a minimum). 

Here are a quick battery of RESTful APIs for a Blog's Post Resource:

       GET /posts    // Returns a list of all posts available!
      POST /posts    // Creates a new post!
       GET /posts/1  // Returns a single post!
       PUT /posts/1  // Updates a post that exists!
    DELETE /posts/1  // Deletes a post that exists!

It should become fairly obvious why there are so many advantages of this style; Idempotency for one. If you are always operating on a specific, unique identifier (1 in the example above), that means that you're only ever going to effect the identifier '1'! So if you triple and quadruple click the button to delete post 1, you're still only ever going to delete post '1'!

One of the few downfalls of REST is the lack of batch APIs. Continuing the Blog example, want to delete 80 posts? Good luck. Make 80 calls to the API. This library attempts to solve that problem on a larger scale, too.

    POST /posts?method=delete
         Body: [1, 2, 3, 4, 5, 10, 42, 68, 99]

The result? Returns an array of response objects, just as if you had made all 9 calls individually! Need to make an update call for a whole bunch of posts at a time? Easy peasy:

    POST /posts?method=update
         Body: { 1: { title: 'My new title!' }, 2: { author: 'Christopher Rueber' } }

Update in this library means Patch. This is due to the authors belief that you generally don't want to completely smash a whole object if you don't include every attribute. The least bandwidth possible should be consumed.

#### Limitations

* Express. Most apps in Node utilize Express, and this library is no different. I have some vague notion of expanding this libraries usefulness beyond Express, but for now, that's where it lives.
* That's it! You define your security model, you can use whatever databases you're currently using; You just have to follow some basic patterns in order to get started.

## Why did I do this?

I saw an awful lot of people taking a shot at this particular problem with different node modules, but not a single one was easy to use or understand. Not only that, but some of them actually got REST wrong! I wanted an easier way to..

1. Simplify writing APIs for Node.
2. Apply RESTful defaults. I shouldn't have to manage when 403's and 405's happen.
3. Usable security, filters, and finders should all be baked in.
4. Easily allow for multiple representations of my resources.

## Getting Started

### Step 1: Set up restful-api

Pull in the library and save it.

    npm install restful-api --save

### Step 2: Initialize restful-api

First you have to require the restful-api, at some point after your express initialization.

    rest = require('restful-api')(app)

### Step 3: Register your controllers

    rest.register_controller('posts', PostsController)

or...

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
    // # (U)pdate: PUT /posts/:id -- at some point, maybe: POST /posts/:id/update
    // # (D)elete: DELETE /posts -- at some point, maybe: POST /posts/:id/delete
    // # Bulk: POST /posts/batch?method=delete body: [id, id, id]
    // # Bulk: POST /posts/batch?method=update body: {id: {}, id: {}}

    // # GET /posts[.json] => {posts: [{id: '1', name: 'balh', content: 'lorem ipsum...'}, {}]}
    // # GET /posts/1[.json] => {posts: [{id: '1', name: 'balh', content: 'lorem ipsum...'}]}
    // # GET /posts/1/comments[.json] => {comments: [{}, {}]}
    // # GET /posts/1/comments?parents=true => {posts: [{}], comments: [{}, {}]}

    // CommentController =
    //   index: (req, res, data) -> # req = {post: PostModel, comment: [CommentModel, CommentModel]}
