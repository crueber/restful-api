
exports.unauthorized = function (res) { responses.send_error(res, 403) }

exports.method_not_allowed = function (res) { responses.send_error(res, 405) }

exports.unknown = function (res) { responses.send_error(res, 404) }

exports.send_error = function (res, code, msg) {
  if (typeof code === 'number' && (code < 400 || code > 599)) code = 400
  if (typeof code === 'string') { msg = code; code = 400; }
  if (global.logger && global.logger.error ) { global.logger.error(msg) }

  var error = { status: 'Failure', message: msg || 'There was an error that occured.', code: code || 400}
  res.set('Content-Type', 'application/json')
  res.status(code).send(JSON.stringify(error))
}

exports.send_success = function (res, code, data) {
  code = code || 200
  data = {status: 'Success', data: data || null, code: code }
  res.set('Content-Type', 'application/json')
  data = JSON.stringify(data)
  res.status(code).send(data)
}

var responses = exports