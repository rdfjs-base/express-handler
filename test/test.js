/* global describe, it */

var assert = require('assert')
var express = require('express')
var rdf = require('rdf-ext')
var rdfBodyParser = require('../')
var request = require('supertest')
var Promise = require('bluebird')

var formats = {
  parsers: {
    parse: function (mediaType, data) {
      return Promise.resolve(JSON.stringify({
        mediaType: mediaType,
        data: data
      }))
    }
  },
  serializers: {
    serialize: function (mediaType, data) {
      return Promise.resolve(JSON.stringify({
        mediaType: mediaType,
        data: data
      }))
    }
  }
}

function asyncAssert (done, callback) {
  Promise.resolve().then(callback).asCallback(done)
}

describe('rdf-body-parser', function () {
  it('should return a middleware function', function () {
    var middleware = rdfBodyParser()

    assert.equal(typeof middleware, 'function')
    assert.equal(middleware.length, 3)
  })

  describe('bodyParser', function () {
    it('should use options body parser if given', function (done) {
      var touched = false
      var app = express()

      app.use(rdfBodyParser({
        bodyParser: function (req, res, next) {
          touched = true

          next()
        },
        formats: formats
      }))

      request(app)
        .post('/')
        .send('test')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert(touched)
          })
        })
    })

    it('should use the default body parser if none was given', function (done) {
      var parsed = false
      var app = express()

      app.use(rdfBodyParser({formats: formats}))
      app.use(function (req, res, next) {
        parsed = req.body && req.body === 'test'

        next()
      })

      request(app)
        .post('/')
        .send('test')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert(parsed)
          })
        })
    })

    it('should use the default formats if none were given', function (done) {
      var parsed = false
      var app = express()

      app.use(rdfBodyParser())
      app.use(function (req, res, next) {
        parsed = req.graph && req.graph.toArray().shift().object.toString() === 'http://example.org/object'

        next()
      })

      request(app)
        .post('/')
        .set('Content-Type', 'text/turtle')
        .send('<http://example.org/subject> <http://example.org/predicate> <http://example.org/object> .')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert(parsed)
          })
        })
    })

    it('should use the media type defined in Content-Type header to parse the data', function (done) {
      var mediaType
      var app = express()

      app.use(rdfBodyParser({formats: formats}))
      app.use(function (req, res, next) {
        mediaType = (JSON.parse(req.graph) || {}).mediaType

        next()
      })

      request(app)
        .post('/')
        .set('Content-Type', 'text/plain')
        .send('test')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert.equal(mediaType, 'text/plain')
          })
        })
    })

    it('should set .graph to null if no body was sent', function (done) {
      var hasGraph = true
      var app = express()

      app.use(rdfBodyParser({formats: formats}))
      app.use(function (req, res, next) {
        hasGraph = !!req.graph

        next()
      })

      request(app)
        .get('/')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert(!hasGraph)
          })
        })
    })

    it('should parse graph and set assign it to .graph', function (done) {
      var graph
      var app = express()

      app.use(rdfBodyParser({formats: formats}))
      app.use(function (req, res, next) {
        graph = JSON.parse(req.graph)

        next()
      })

      request(app)
        .post('/')
        .send('test')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert.equal(graph.data, 'test')
          })
        })
    })

    it('should handle parser error', function (done) {
      var errorThrown = false
      var app = express()

      app.use(rdfBodyParser({
        formats: {
          parsers: {
            parse: function () {
              return Promise.reject(new Error())
            }
          }
        }
      }))
      app.use(function (err, req, res, next) {
        errorThrown = err instanceof Error

        next()
      })

      request(app)
        .post('/')
        .send('test')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert(errorThrown)
          })
        })
    })
  })

  describe('sendGraph', function () {
    it('should search for a serializer', function (done) {
      var searched = false
      var app = express()

      app.use(rdfBodyParser({formats: formats}))
      app.use(function (req, res, next) {
        res.sendGraph('test')

        next()
      })

      formats.serializers.list = function () {
        searched = true

        return []
      }

      request(app)
        .get('/')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert(searched)
          })
        })
    })

    it('should reject if no serializer was found', function (done) {
      var rejected = false
      var app = express()

      app.use(rdfBodyParser({formats: formats}))
      app.use(function (req, res, next) {
        res.sendGraph('test').catch(function () {
          rejected = true
        })

        next()
      })

      formats.serializers.list = function () {
        return []
      }

      request(app)
        .get('/')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert(rejected)
          })
        })
    })

    it('should pick a media type if multiple are given', function (done) {
      var app = express()

      app.use(rdfBodyParser({formats: formats}))
      app.use(function (req, res, next) {
        res.sendGraph('test', 'text/html text/plain')

        next()
      })

      formats.serializers.list = function () {
        return ['text/plain']
      }

      request(app)
        .get('/')
        .set('Accept', 'text/plain')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            var result = JSON.parse(res.text) || {}

            assert.equal(result.mediaType, 'text/plain')
          })
        })
    })

    it('should pick a media type if multiple are given in an array', function (done) {
      var app = express()

      app.use(rdfBodyParser({formats: formats}))
      app.use(function (req, res, next) {
        res.sendGraph('test', ['text/html', 'text/plain'])

        next()
      })

      formats.serializers.list = function () {
        return ['text/plain']
      }

      request(app)
        .get('/')
        .set('Accept', 'text/plain')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            var result = JSON.parse(res.text) || {}

            assert.equal(result.mediaType, 'text/plain')
          })
        })
    })

    it('should send serialized graph with Content-Type header', function (done) {
      var app = express()

      app.use(rdfBodyParser({formats: formats}))
      app.use(function (req, res, next) {
        res.sendGraph('test')

        next()
      })

      formats.serializers.list = function () {
        return ['text/plain']
      }

      request(app)
        .get('/')
        .set('Accept', 'text/plain')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            var result = JSON.parse(res.text) || {}

            assert.equal(result.mediaType, 'text/plain')
            assert.equal(result.data, 'test')
          })
        })
    })

    it('should handle send errors', function (done) {
      var errorCatched = false
      var app = express()

      app.use(rdfBodyParser({formats: formats}))
      app.use(function (req, res, next) {
        var end = res.end

        res.end = function (data, callback) {
          if (callback) {
            callback(new Error())
          }
        }

        res.sendGraph('test').catch(function () {
          errorCatched = true

          // restore original end method
          res.end = end

          next()
        })
      })

      formats.serializers.list = function () {
        return ['text/plain']
      }

      request(app)
        .get('/')
        .set('Accept', 'text/plain')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert.equal(errorCatched, true)
          })
        })
    })

    it('should reject on parser error', function (done) {
      var rejected = false
      var app = express()

      app.use(rdfBodyParser({
        formats: {
          serializers: {
            list: function () {
              return ['text/plain']
            },
            serialize: function () {
              return Promise.reject(new Error())
            }
          }
        }
      }))
      app.use(function (req, res, next) {
        res.sendGraph('test').catch(function () {
          rejected = true
        })

        next()
      })

      request(app)
        .get('/')
        .set('Accept', 'text/plain')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert(rejected)
          })
        })
    })
  })

  describe('.attach', function () {
    it('should do nothing if there is already a .graph property and .sendGraph method', function () {
      var graph = {}
      var sendGraph = function () {}
      var req = {graph: graph}
      var res = {sendGraph: sendGraph}

      return rdfBodyParser.attach(req, res).then(function () {
        assert.equal(req.graph, graph)
        assert.equal(res.sendGraph, sendGraph)
      })
    })

    it('should parse the body and attach the .sendGraph method', function () {
      var req = {
        body: '<http://example.org/subject> <http://example.org/predicate> <http://example.org/object> .\n',
        headers: {
          'content-type': 'application/n-triples'
        }
      }

      var res = {}

      var graph = rdf.createGraph([
        rdf.createTriple(
          rdf.createNamedNode('http://example.org/subject'),
          rdf.createNamedNode('http://example.org/predicate'),
          rdf.createNamedNode('http://example.org/object')
        )
      ])

      return rdfBodyParser.attach(req, res).then(function () {
        assert.equal(req.graph.equals(graph), true)
        assert.equal(typeof res.sendGraph, 'function')
      })
    })
  })
})
