var Promise = require('bluebird')
var bodyParser = require('body-parser')
var formats = require('rdf-formats-common')()

function init (options) {
  options = options || {}

  // default options
  options.bodyParser = options.bodyParser || bodyParser.text({type: '*/*'})
  options.formats = options.formats || formats

  // .sendGraph function
  var sendGraph = function (graph, mediaType) {
    var res = this

    mediaType = mediaType || res.req.accepts(options.formats.serializers.list()) || options.defaultMediaType

    if (!mediaType || typeof mediaType !== 'string') {
      return Promise.reject(new Error('no serializer found'))
    }

    return options.formats.serializers.serialize(mediaType, graph).then(function (serialized) {
      res.setHeader('Content-Type', mediaType)

      return Promise.promisify(res.end, {context: res})(serialized)
    })
  }

  // middleware
  return function (req, res, next) {
    options.bodyParser(req, res, function () {
      res.sendGraph = sendGraph

      var mediaType = 'content-type' in req.headers ? req.headers['content-type'] : options.defaultMediaType

      // empty body
      if (typeof req.body === 'object' && Object.keys(req.body).length === 0) {
        return next()
      }

      options.formats.parsers.parse(mediaType, req.body).then(function (graph) {
        req.graph = graph

        next()
      }).catch(function (error) {
        next(error)
      })
    })
  }
}

module.exports = init
