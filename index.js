var bodyParser = require('body-parser')

function init (formats, options) {
  options = options || {}

  // default options
  options.bodyParser = options.bodyParser || bodyParser.text({type: '*/*'})

  // .sendGraph function
  var sendGraph = function (graph, mediaType) {
    var res = this

    mediaType = mediaType || res.req.accepts(formats.serializers.list()) || options.defaultMediaType

    if (!mediaType || typeof mediaType !== 'string') {
      return Promise.reject(new Error('no serializer found'))
    }

    return formats.serializers.serialize(mediaType, graph).then(function (serialized) {
      res.set('Content-Type', mediaType)
      res.end(serialized)
    })
  }

  // middleware
  return function (req, res, next) {
    options.bodyParser(req, res, function () {
      res.sendGraph = sendGraph

      var mediaType = req.get('Content-Type') || options.defaultMediaType

      // empty body
      if (typeof req.body === 'object' && Object.keys(req.body).length === 0) {
        return next()
      }

      formats.parsers.parse(mediaType, req.body).then(function (graph) {
        req.graph = graph

        next()
      }).catch(function (error) {
        next(error)
      })
    })
  }
}

module.exports = init
