/* global describe, it */

const assert = require('assert')
const express = require('express')
const rdf = require('rdf-ext')
const rdfBodyParser = require('../')
const request = require('supertest')
const Readable = require('stream').Readable

const formats = {
  parsers: {
    import: (mediaType, data) => {
      const stream = new Readable({
        objectMode: true,
        read: () => {}
      })

      stream.push(JSON.stringify({
        mediaType: mediaType,
        data: data
      }))

      stream.push(null)

      return stream
    }
  },
  serializers: {
    import: (mediaType, data) => {
      const stream = new Readable({
        objectMode: true,
        read: () => {}
      })

      stream.push(JSON.stringify({
        mediaType: mediaType,
        data: data
      }))

      stream.push(null)

      return stream
    }
  }
}

describe('rdf-body-parser', () => {
  it('should return a middleware function', () => {
    const middleware = rdfBodyParser()

    assert.equal(typeof middleware, 'function')
    assert.equal(middleware.length, 3)
  })

  describe('request.graph', () => {
    it('should use options body parser if given', () => {
      const app = express()

      let touched = false

      app.use(rdfBodyParser({
        bodyParser: (req, res, next) => {
          touched = true

          next()
        },
        formats: formats
      }))

      return request(app)
        .post('/')
        .send('test')
        .then((res) => {
          assert(touched)
        })
    })

    it('should use the default body parser if none was given', () => {
      const app = express()

      let parsed = false

      app.use(rdfBodyParser({formats: formats}))

      app.use((req, res, next) => {
        parsed = req.body && req.body === 'test'

        next()
      })

      return request(app)
        .post('/')
        .send('test')
        .then((res) => {
          assert(parsed)
        })
    })

    it('should use the default formats if none were given', () => {
      const app = express()

      let parsed = false

      app.use(rdfBodyParser())

      app.use((req, res, next) => {
        parsed = req.graph && req.graph.toArray().shift().object.toString() === 'http://example.org/object'

        next()
      })

      return request(app)
        .post('/')
        .set('Content-Type', 'text/turtle')
        .send('<http://example.org/subject> <http://example.org/predicate> <http://example.org/object> .')
        .then((res) => {
          assert(parsed)
        })
    })

    it('should use the media type defined in Content-Type header to parse the data', () => {
      const app = express()

      let mediaType

      app.use(rdfBodyParser({formats: formats}))

      app.use((req, res, next) => {
        mediaType = JSON.parse(req.graph._quads[0]).mediaType

        next()
      })

      return request(app)
        .post('/')
        .set('Content-Type', 'text/plain')
        .send('test')
        .then((res) => {
          assert.equal(mediaType, 'text/plain')
        })
    })

    it('should set .graph to null if no body was sent', () => {
      const app = express()

      let hasGraph = true

      app.use(rdfBodyParser({formats: formats}))

      app.use((req, res, next) => {
        hasGraph = !!req.graph

        next()
      })

      return request(app)
        .get('/')
        .then((res) => {
          assert(!hasGraph)
        })
    })

    it('should parse graph and set assign it to .graph', () => {
      const app = express()

      let graph

      app.use(rdfBodyParser({formats: formats}))

      app.use((req, res, next) => {
        graph = JSON.parse(req.graph._quads[0])

        next()
      })

      return request(app)
        .post('/')
        .send('test')
        .then((res) => {
          assert.equal(graph.data._str, 'test')
        })
    })

    it('should handle parser error', () => {
      const app = express()

      let errorThrown = false

      app.use(rdfBodyParser({
        formats: {
          parsers: {
            import: () => {
              const stream = new Readable({
                read: () => {
                  stream.emit('error', new Error())
                }
              })

              return stream
            }
          }
        }
      }))

      app.use((err, req, res, next) => {
        errorThrown = err instanceof Error

        next()
      })

      return request(app)
        .post('/')
        .send('test')
        .then((res) => {
          assert(errorThrown)
        })
    })
  })

  describe('response.graph', () => {
    it('should search for a serializer', () => {
      const app = express()

      let searched = false

      app.use(rdfBodyParser({formats: formats}))

      app.use((req, res, next) => {
        res.graph('test').catch((err) => {}) // eslint-disable-line handle-callback-err

        next()
      })

      formats.serializers.list = () => {
        searched = true

        return []
      }

      return request(app)
        .get('/')
        .then((res) => {
          assert(searched)
        })
    })

    it('should reject if no serializer was found', () => {
      const app = express()

      let rejected = null

      app.use(rdfBodyParser({formats: formats}))

      app.use((req, res, next) => {
        res.graph('test').catch((err) => {
          rejected = err
        })

        next()
      })

      formats.serializers.list = () => {
        return []
      }

      return request(app)
        .get('/')
        .then((res) => {
          assert.equal(rejected.statusCode, 406)
        })
    })

    it('should pick a media type if multiple are given', () => {
      const app = express()

      app.use(rdfBodyParser({formats: formats}))

      app.use((req, res, next) => {
        res.graph('test', 'text/html text/plain')

        next()
      })

      formats.serializers.list = () => {
        return ['text/plain']
      }

      return request(app)
        .get('/')
        .set('Accept', 'text/plain')
        .then((res) => {
          assert.equal(JSON.parse(res.text).mediaType, 'text/plain')
        })
    })

    it('should pick a media type if multiple are given in an array', () => {
      const app = express()

      app.use(rdfBodyParser({formats: formats}))

      app.use((req, res, next) => {
        res.graph('test', ['text/html', 'text/plain'])

        next()
      })

      formats.serializers.list = () => {
        return ['text/plain']
      }

      return request(app)
        .get('/')
        .set('Accept', 'text/plain')
        .then((res) => {
          assert.equal(JSON.parse(res.text).mediaType, 'text/plain')
        })
    })

    it('should send serialized graph with Content-Type header', () => {
      const app = express()

      app.use(rdfBodyParser({formats: formats}))

      app.use((req, res, next) => {
        res.graph('test')

        next()
      })

      formats.serializers.list = () => {
        return ['text/plain']
      }

      return request(app)
        .get('/')
        .set('Accept', 'text/plain')
        .then((res) => {
          const result = JSON.parse(res.text)

          assert.equal(result.mediaType, 'text/plain')
          assert.equal(result.data, 'test')
        })
    })

    it('should reject on parser error', () => {
      const app = express()

      let rejected = false

      app.use(rdfBodyParser({
        formats: {
          serializers: {
            list: () => {
              return ['text/plain']
            },
            import: () => {
              const stream = new Readable({
                read: () => {
                  stream.emit('error', new Error())
                }
              })

              return stream
            }
          }
        }
      }))

      app.use((req, res, next) => {
        res.graph('test').catch(() => {
          rejected = true
        })

        next()
      })

      return request(app)
        .get('/')
        .set('Accept', 'text/plain')
        .then((res) => {
          assert(rejected)
        })
    })
  })

  describe('.attach', () => {
    it('should do nothing if there is already a .graph property and .graph method', () => {
      const graph = {}
      const sendGraph = () => {}
      const req = {graph: graph}
      const res = {graph: sendGraph}

      return rdfBodyParser.attach(req, res).then(() => {
        assert.equal(req.graph, graph)
        assert.equal(res.graph, sendGraph)
      })
    })

    it('should parse the body and attach the .graph method', () => {
      const req = {
        body: '<http://example.org/subject> <http://example.org/predicate> <http://example.org/object> .\n',
        headers: {
          'content-type': 'application/n-triples'
        }
      }

      const res = {}

      const graph = rdf.dataset([
        rdf.quad(
          rdf.namedNode('http://example.org/subject'),
          rdf.namedNode('http://example.org/predicate'),
          rdf.namedNode('http://example.org/object')
        )
      ])

      return rdfBodyParser.attach(req, res).then(() => {
        assert.equal(req.graph.equals(graph), true)
        assert.equal(typeof res.graph, 'function')
      })
    })
  })
})
