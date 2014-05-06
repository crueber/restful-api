var emptyFn = function () {}
emptyFn.info = emptyFn
emptyFn.debug = emptyFn

module.exports = {
  "format"         : "json",

  "index"          : "index",
  "create"         : "create",
  "read"           : "read",
  "update"         : "update",
  "delete"         : "delete",
  "before_filters" : "before_filters",
  "after_filters"  : "after_filters",
  "secure"         : "secure",
  "finder"         : "finder",

  "prefix"         : "/",
  "logger"         : emptyFn
}