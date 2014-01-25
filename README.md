# restful-api

app = express()
rest = require('rest')(app, { format: 'json' })

# GET /posts[.json] => {posts: [{id: '1', name: 'balh', content: 'lorem ipsum...'}, {}]}
# GET /posts/1[.json] => {posts: [{id: '1', name: 'balh', content: 'lorem ipsum...'}]}
# GET /posts/1/comments[.json] => {comments: [{}, {}]}
# GET /posts/1/comments?parents=true => {posts: [{}], comments: [{}, {}]}

rest.resource 'posts', PostController
# Index: GET /posts, 
# (C)reate: POST /posts, 
# (R)ead: GET /posts/:id, GET /post/:id, 
# (U)pdate: PUT /posts/:id, PUT /post/:id, POST /posts/:id/update, POST /post/:id/update 
# (D)elete: DELETE /posts, DELETE /post, POST /posts/:id/delete, POST /post/:id/delete
# Bulk: POST /posts/bulk?method=delete body: [id, id, id]
# Bulk: POST /posts/bulk?method=update body: {id: {}, id: {}}
rest.resource 'posts', 'comments', CommentController

before_filter = (req, res, next) -> callback(null)
after_filter = (req, res) -> return
# Each entry is listed in respective order that it would be run.
PostController = 
  populate_model: (params, plural, model) -> model(null, PostModel)
  secure: (req, res, is_secure) -> is_secure(null, true)
  before_filters: [ before_filter, before_filter ]
  index: (req, res, data) -> data(null, {})
  read: (req, res, data) -> data(null, {})
  create: (req, res, data) -> data(null, {})
  update: (req, res, data) -> data(null, {})
  delete: (req, res, data) -> data(null, {})
  bulk: (req, res, data) -> data(null, [{}, {}])
  after_filters: [ after_filter ]

CommentController =
  index: (req, res, data) -> # req = {post: PostModel, comment: [CommentModel, CommentModel]}

