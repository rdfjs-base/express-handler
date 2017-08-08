/* global describe, it */

const assert = require('assert')
const express = require('express')
const rdf = require('rdf-ext')
const formats = require('rdf-formats-common')()
const rdfBodyParser = require('../')
const request = require('supertest')
const Readable = require('stream').Readable

const dummyFormats = {
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
    },
    list: () => {
      return ['text/plain']
    }
  }
}

const simpleGraph = rdf.dataset([
  rdf.quad(rdf.namedNode('http://example.org/subject'), rdf.namedNode('http://example.org/predicate'), rdf.literal('object'))
])

const simpleGraphNt = simpleGraph.toString()

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

          req.body = simpleGraphNt

          next()
        }
      }))

      return request(app)
        .post('/')
        .set('content-type', 'application/n-triples')
        .send(simpleGraphNt)
        .then((res) => {
          assert(touched)
        })
    })

    it('should use the default body parser if none was given', () => {
      const app = express()

      let parsed = false

      app.use(rdfBodyParser())

      app.use((req, res, next) => {
        parsed = req.body && req.body === simpleGraphNt

        next()
      })

      return request(app)
        .post('/')
        .set('content-type', 'application/n-triples')
        .send(simpleGraphNt)
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
        .set('content-type', 'application/n-triples')
        .send('<http://example.org/subject> <http://example.org/predicate> <http://example.org/object> .')
        .then((res) => {
          assert(parsed)
        })
    })

    it('should set .graph to null if no body was sent', () => {
      const app = express()

      let hasGraph = true

      app.use(rdfBodyParser())

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

      let parsed

      app.use(rdfBodyParser())

      app.use((req, res, next) => {
        parsed = simpleGraph.equals(req.graph)

        next()
      })

      return request(app)
        .post('/')
        .set('content-type', 'application/n-triples')
        .send(simpleGraphNt)
        .then((res) => {
          assert(parsed)
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

      const customFormats = Object.create(formats)

      customFormats.serializers = Object.create(customFormats.serializers)
      customFormats.serializers.list = () => {
        searched = true

        return []
      }

      app.use(rdfBodyParser({formats: customFormats}))

      app.use((req, res, next) => {
        res.graph('test').catch((err) => {}) // eslint-disable-line handle-callback-err

        next()
      })

      return request(app)
        .get('/')
        .then((res) => {
          assert(searched)
        })
    })

    it('should reject if no serializer was found', () => {
      const app = express()

      let rejected = null

      const customFormats = Object.create(formats)

      customFormats.serializers = Object.create(customFormats.serializers)
      customFormats.serializers.list = () => {
        return []
      }

      app.use(rdfBodyParser({formats: customFormats}))

      app.use((req, res, next) => {
        res.graph('test').catch((err) => {
          rejected = err
        })

        next()
      })

      return request(app)
        .get('/')
        .then((res) => {
          assert.equal(rejected.statusCode, 406)
        })
    })

    it('should pick a media type if multiple are given', () => {
      const app = express()

      app.use(rdfBodyParser({formats: dummyFormats}))

      app.use((req, res, next) => {
        res.graph(rdf.dataset(), 'text/html text/plain')

        next()
      })

      return request(app)
        .get('/')
        .set('accept', 'text/plain')
        .then((res) => {
          assert.equal(JSON.parse(res.text).mediaType, 'text/plain')
        })
    })

    it('should pick a media type if multiple are given in an array', () => {
      const app = express()

      app.use(rdfBodyParser({formats: dummyFormats}))

      app.use((req, res, next) => {
        res.graph(rdf.dataset(), ['text/html', 'text/plain'])

        next()
      })

      return request(app)
        .get('/')
        .set('accept', 'text/plain')
        .then((res) => {
          assert.equal(JSON.parse(res.text).mediaType, 'text/plain')
        })
    })

    it('should send serialized graph with Content-Type header', () => {
      const app = express()

      app.use(rdfBodyParser())

      app.use((req, res, next) => {
        res.graph(simpleGraph)

        next()
      })

      return request(app)
        .get('/')
        .set('accept', 'application/n-triples')
        .then((res) => {
          assert.equal(res.headers['content-type'], 'application/n-triples; charset=utf-8')
          assert.equal(res.text, simpleGraphNt)
        })
    })

    it('should send serialized quad stream with Content-Type header', () => {
      const app = express()

      const stream = new Readable({
        objectMode: true,
        read: () => {}
      })

      stream.push(simpleGraph.toArray().shift())
      stream.push(null)

      app.use(rdfBodyParser())

      app.use((req, res, next) => {
        res.graph(stream)

        next()
      })

      return request(app)
        .get('/')
        .set('accept', 'application/n-triples')
        .then((res) => {
          assert.equal(res.headers['content-type'], 'application/n-triples; charset=utf-8')
          assert.equal(res.text, simpleGraphNt)
        })
    })

    it('should reject on serializer error', () => {
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
        res.graph(rdf.dataset()).catch(() => {
          rejected = true
        })

        next()
      })

      return request(app)
        .get('/')
        .set('accept', 'text/plain')
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
        body: simpleGraphNt,
        headers: {
          'content-type': 'application/n-triples'
        }
      }

      const res = {}

      return rdfBodyParser.attach(req, res).then(() => {
        assert.equal(req.graph.equals(simpleGraph), true)
        assert.equal(typeof res.graph, 'function')
      })
    })
  })
})
