# Beta Testing Under Way

This package is now in use in a beta application. Expect some evolution still, though it is certainly ready for usage in apps now! 

### Contributions

... if you would like to help, feel free to write some unit tests. ;)

# RESTful API

## What is this thing?

REST. It's not just a bunch of letters and a vague way to get things done. It is a way of looking at interfacing with systems using nouns and verbs. Luckily, over HTTP, we have both! All we have to do is start structuring our requests in a grammatically correct way. The result is faster development, easier maintenance and an all around better way to build APIs. 

## How's it work?

Here are a quick battery of RESTful APIs for a Blog "Post" Resource:

       GET /posts    // Returns a list of all posts available!
      POST /posts    // Creates a new post!
       GET /posts/1  // Returns a single post!
       PUT /posts/1  // Updates a post that exists!
    DELETE /posts/1  // Deletes a post that exists!

It should become fairly obvious why there are so many advantages of this style; Convention over configuration. Powerful simplicity. Best of all, it's more or less become the standard API style over the web. No assumptions are made (in this framework) about your applications general structure. Security is strongly supported in each resource, but you can still structure your app as you like. It is recommended that you follow REST guidelines and make it possible for each individual request to require authorization, rather than relying purely on sessions.

One of the few downfalls of REST is the lack of batch APIs. Continuing the Blog example, want to delete 80 posts? Good luck. Make 80 calls to the API. This library attempts to solve that problem on a larger scale, too. But you shouldn't have to write any extra code. It will look to your code as if 80 separate calls were made (if you use the batch functionality of this library).

    POST /posts/batch
         Body: { 'delete': [1, 2, 3, 4, 5, 10, 42, 68, 99] }

The result? Returns an array of response objects, just as if you had made all 9 calls individually! Need to make an update call for a whole bunch of posts at a time? Create a bunch? Easy peasy:

    POST /posts/batch
         Body: { 'update': { 1: { title: 'My new title!' }, 2: { author: 'Walter White' } } }
    POST /posts/batch
         Body: { 'create': [{ name: 'New post!', body: 'Some stuff..' }, { name: 'Another...', body: 'This is nifty!'}] }

#### Limitations and/or Assumptions

* ExpressJS: Most apps in Node utilize Express, and this library is no different. If you have thoughts on how to extend it past express, I'm all ears.
* HTTP PATCH vs PUT. Essentially, a PUT over-writes the object, while a PATCH only over-writes the attributes given. In practice, PUT becomes very rare when you make this distinction. So only PUT is supported, and you can choose to have it act as it normally would, or as a PATCH in your resource. I'll say this though: Modern devices need to consume less bandwidth to be as responsive as possible. I recommend not adding extra fields to your requests if you can help it.
* That's it! You define your security model, you can use whatever databases you're currently using; You just have to follow some basic patterns in order to get started.

## Why did I do this?

None of the available REST libraries did what I wanted. They were either too obscure, not well documented enough, or just flat out got REST wrong. My goals for this project are:

1. Keep it RESTful. It isn't that hard, and you'll thank yourself for it after you've done it for a while.
2. Simple RESTful APIs should be fast to build, but also feature rich.
3. Complicated APIs shouldn't require extra architecting. They should be able to use the same code as smaller codebases.
4. RESTful by default. HTTP verbs and nouns, but only for what your app knows. No managing 403s and 405s.
5. Filters!! Finder, secure, and before and after filters. Applied for **every single level of nesting**. Stay DRY and keep your concerns clean!
6. Represent array/hash data, in any format. JSON provided by default.
7. Sane but overridable defaults.
8. **Single Page Applications (SPAs) need sane, growable APIs**. This is my primary motivation for this library. No display API will be provided for 'new', 'edit', or 'list', because the intention of this library is specifically to solve a data problem, not a display one. Take a look at Angular, Backbone, or Ember if you're looking for an SPA framework.

### What problems will this library not solve for me?

1. User authentication. Well outside the purview of this library.
2. The "V" of MVC. Views are another domain that needs solving separately.
3. Non-conventional API building. If you want to build APIs that don't conform to REST, you're in the wrong place!

## Getting Started

### Step 1: Set up restful-api

    npm install restful-api --save

### Step 2: Initialize restful-api

First you have to require the restful-api, at some point after your express initialization.

    var rest = new require('restful-api')(app); // where 'app' is your express application.

There is a second parameter available as a default override. Lets say you decided to call your indices 'list' instead of 'index'. You could apply that as default across your app in one fell swoop, like so:

    var rest = new require('restful-api')(app, { index: 'list' })

For more info on defaults, take a look at `restful-api/lib/defaults.js`

### Step 3: Register your controllers

This isn't obvious when you first look at it, but will become more understandable when you get to Step 5 (where "Controller" is explained).

    rest.register_controller('posts', PostsController)

or, if you would prefer to regisgter multiple at once...

    rest.register_controller({ 'posts': PostsController, 'comments': CommentsController })

### Step 4: Register your resources individually (they can be nested!).

The first parameter in the registering of the controller (Step 3) is the what you use as parameters, here.

    rest.resource('posts')              // <-- Produces /posts pathing!
    rest.resource('posts', 'comments')  // <-- Produces /posts/:post_id/comments pathing! ..hang tight for more info on this.

The last parameter may be used for overriding defaults, just the same way as mentioned in Step 2. Ex:

    rest.resource('posts', { read: 'show' }) // uses the 'show' function on the Controller, instead of the 'read' function.

Any name that you registered can be added to the options object, plus '_resource', and given a value that you prefer. For example...

    rest.resource('posts', 'comments', {posts_resource: 'articles', comments_resource: 'blathers'})

Thus setting up your routing to `/articles/:article_id/blathers` instead of `/posts/:post_id/comments`.

You can also add specific actions for your controller!

    // add a GET route for /posts/blather that will be passed to 'blather' in your controller with all filters applied.
    res.resouce('posts', { list_actions: [{http_verb: 'get', controller_action: 'blather'}] })

    // add a GET route for /posts/:post_id/blather that will be passed to 'blather' in your controller with all filters applied.
    res.resource('posts', { individual_actions: [{http_verb: 'get', controller_action: 'blather'}] })

### Step 5: Start building your controllers in this fashion!

These are the properties and callbacks that a controller may have on it. All callbacks are the last arg of the function signature, 
and they all follow the node convention of callback(err, args...).

    PostsController = {
      // identifier is a string that was passed in the URI.
      // is_index is a boolean for if this was called from an index or not
      // callback takes err and the model. the model will be set on the request object for subsequent requests (pluralized when index, singularized when not).
      finder: function (req, identifier, is_index, callback) {},     
      // is_nested indicates whether this controllers action will be called. 
      // is_secure_callback takes err and a boolean to indicate if the request is authorized.
      secure: function (req, is_nested, is_secure_callback) {}, 

      // filters that are run before the resource function. Callback takes err.
      before_filters: [ function (req, res, callback) ],
      // filters that are run after the resource function, and after the response has been sent. Callback takes err.
      after_filters: [ function (req, res, callback) ],
      
      // ** Actions: These are the actually heavy lifters of a resource.
      // data is a callback that accepts error and an array of serializable objects. Each object must contain an 'id' property.
      index: function (req, res, data) {},
      // data is a callback that accepts error and a serializable object. Must contain on 'id' property.
      read: function (req, res, data) {},
      // data is a callback that takes error and a serializable version of the created resource. Must contain an 'id' property.
      create: function (req, res, data) {},
      // data is a callback that takes error and a serializable version of the updated resource. Must contain an 'id' property.
      update: function (req, res, data) {},
      // success is a callback that takes error. If there isn't one, it returns 200 to indicate success.
      remove: function (req, res, success) {}
    }

Note that if you omit any of these, it doesn't matter! They're simply not applied to that particular resource. Missing a finder? No biggy. No security necessary? Omit the secure property. Don't need an index? Don't use it! That simple. Oh, and if you omit an action, a proper 405 will be returned by default.

#### Notes

**Nested Controllers**: When you nest your controllers (say, posts/comments), only the action of the final controller is called. But the finder and secure filters are run on every single controller, from left to right. That means that if you lock down a posts controller, it'll apply all the way down the line. Make sure you make use of the is_nested boolean so that you don't unnecessarily lock down controllers that are further down the execution path!

**Batch API**: When you use the batch API, you are running the final resources finder, secure, filters, and action, multiple times, with different identifiers for finder each time. So you don't have to change anything in order to deal with those batches.

### Step 6: ...

### Step 7: Profit!

...yup, that's it! It's that easy. And now, you'll have an amazingly easy way to build APIs quickly and efficiently.

## Comments? Concerns?

There is an issue tracker associated with this library on github. Please feel free to open an issue if you feel that something is incorrect, or come find me on twitter: @crueber.