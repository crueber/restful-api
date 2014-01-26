
exports.unauthorized = function (res) { responses.send_error(res, 403) }

exports.method_not_allowed = function(res) { responses.send_error(res, 405) }

exports.send_error = function (res, code, msg) {
  if (typeof code === 'number' && (code < 400 || code > 599)) code = 400
  if (typeof code === 'string') { msg = code; code = 400; }
  if (global.logger && global.logger.error ) { global.logger.error(msg) }

  var error = { status: 'Error', message: msg || 'There was an error that occured.', code: code || 400}
  res.status(code).json(error)
}

var responses = exports