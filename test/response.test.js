/* global describe, it */

import assert from 'assert'
import * as example from './support/example.js'
import * as exampleQuad from './support/exampleQuad.js'
import express from 'express'
import formatsMock from './support/formatsMock.js'
import rdf from '@rdfjs/dataset'
import toStream from 'rdf-dataset-ext/toStream.js'
import rdfHandler from '../index.js'
import request from 'supertest'
import SinkMap from '@rdfjs/sink-map'

describe('response', () => {
  describe('dataset', () => {
    it('should search for a serializer', async () => {
      let searched = false
      const app = express()
      const serializers = new Proxy(new Map(), {
        get: (target, property) => {
          searched = true

          return target[property].bind(target)
        }
      })
      const customFormats = {
        parsers: new Map(),
        serializers
      }

      app.use(rdfHandler({ formats: customFormats }))
      app.use(async (req, res, next) => {
        try {
          await res.dataset(rdf.dataset())
        } catch (err) {}

        next()
      })

      await request(app).get('/')

      assert(searched)
    })

    it('should throw an error if no serializer was found', async () => {
      let error = null
      const app = express()
      const customFormats = {
        parsers: new SinkMap(),
        serializers: new SinkMap()
      }

      app.use(rdfHandler({ formats: customFormats }))
      app.use(async (req, res, next) => {
        try {
          await res.dataset(rdf.dataset())
        } catch (err) {
          error = err
        }

        next()
      })

      await request(app).get('/')

      assert(error)
    })

    it('should pick a media type matching the available serializers if multiple are given in accept header', async () => {
      const app = express()
      const customFormats = formatsMock({
        serialize: () => {
          return 'test'
        }
      })

      app.use(rdfHandler({ formats: customFormats }))
      app.use(async (req, res) => {
        await res.dataset(rdf.dataset())
      })

      const res = await request(app).get('/')
        .set('accepts', 'text/html text/plain')

      assert.strictEqual(res.text, 'test')
    })

    it('should send Content-Type header', async () => {
      const app = express()

      app.use(rdfHandler())
      app.use(async (req, res) => {
        await res.dataset(example.dataset)
      })

      const res = await request(app).get('/')
        .set('accept', 'application/n-triples')

      assert.strictEqual(res.headers['content-type'], 'application/n-triples; charset=utf-8')
    })

    it('should send serialized content', async () => {
      const app = express()

      app.use(rdfHandler())
      app.use(async (req, res) => {
        await res.dataset(example.dataset)
      })

      const res = await request(app).get('/')
        .set('accept', 'application/n-triples')

      assert.strictEqual(res.text, example.nt)
    })

    it('should forward serializer errors', async () => {
      let error = null
      const app = express()
      const customFormats = formatsMock({
        serialize: () => {
          throw new Error()
        }
      })

      app.use(rdfHandler({ formats: customFormats }))
      app.use(async (req, res, next) => {
        try {
          await res.dataset(rdf.dataset())
        } catch (err) {
          error = err
        }

        next()
      })

      await request(app).get('/')
        .set('accept', 'text/plain')

      assert(error)
    })

    it('should forward options to the serializer', async () => {
      let givenOptions = null
      const options = {}
      const app = express()
      const customFormats = formatsMock({
        serialize: (quadStream, options) => {
          givenOptions = options
        }
      })

      app.use(rdfHandler({ formats: customFormats }))
      app.use(async (req, res, next) => {
        await res.dataset(rdf.dataset(), options)

        next()
      })

      await request(app).get('/')
        .set('accept', 'text/plain')

      assert.strictEqual(givenOptions, options)
    })
  })

  describe('quadStream', () => {
    it('should search for a serializer', async () => {
      let searched = false
      const app = express()
      const serializers = new Proxy(new Map(), {
        get: (target, property) => {
          searched = true

          return target[property].bind(target)
        }
      })
      const customFormats = {
        parsers: new Map(),
        serializers
      }

      app.use(rdfHandler({ formats: customFormats }))
      app.use(async (req, res, next) => {
        try {
          await res.quadStream(toStream(rdf.dataset()))
        } catch (err) {}

        next()
      })

      await request(app).get('/')

      assert(searched)
    })

    it('should throw an error if no serializer was found', async () => {
      let error = null
      const app = express()
      const customFormats = {
        parsers: new SinkMap(),
        serializers: new SinkMap()
      }

      app.use(rdfHandler({ formats: customFormats }))
      app.use(async (req, res, next) => {
        try {
          await res.quadStream(rdf.dataset().toStream())
        } catch (err) {
          error = err
        }

        next()
      })

      await request(app).get('/')

      assert(error)
    })

    it('should pick a media type matching the available serializers if multiple are given in accept header', async () => {
      const app = express()
      const customFormats = formatsMock({
        serialize: () => {
          return 'test'
        }
      })

      app.use(rdfHandler({ formats: customFormats }))
      app.use(async (req, res) => {
        await res.quadStream(toStream(rdf.dataset()))
      })

      const res = await request(app).get('/')
        .set('accepts', 'text/html text/plain')

      assert.strictEqual(res.text, 'test')
    })

    it('should send Content-Type header', async () => {
      const app = express()

      app.use(rdfHandler())
      app.use(async (req, res) => {
        await res.quadStream(toStream(example.dataset))
      })

      const res = await request(app).get('/')
        .set('accept', 'application/n-triples')

      assert.strictEqual(res.headers['content-type'], 'application/n-triples; charset=utf-8')
    })

    it('should send serialized triple content', async () => {
      const app = express()

      app.use(rdfHandler())
      app.use(async (req, res) => {
        await res.quadStream(toStream(example.dataset))
      })

      const res = await request(app).get('/')
        .set('accept', 'application/n-triples')

      assert.strictEqual(res.text, example.nt)
    })

    it('should send serialized quad content', async () => {
      const app = express()

      app.use(rdfHandler())
      app.use(async (req, res) => {
        await res.quadStream(toStream(exampleQuad.dataset))
      })

      const res = await request(app).get('/')
        .set('accept', 'application/n-quads')

      assert.strictEqual(res.text, exampleQuad.nq)
    })

    it('should send serialized triple content if quads are given and sendTriples is true', async () => {
      const app = express()

      app.use(rdfHandler({ sendTriples: true }))
      app.use(async (req, res) => {
        await res.quadStream(toStream(exampleQuad.dataset))
      })

      const res = await request(app).get('/')
        .set('accept', 'application/n-quads, application/n-triples')

      assert.strictEqual(res.text, example.nt)
    })

    it('should forward serializer errors', async () => {
      let error = null
      const app = express()
      const customFormats = formatsMock({
        serialize: () => {
          throw new Error()
        }
      })

      app.use(rdfHandler({ formats: customFormats }))
      app.use(async (req, res, next) => {
        try {
          await res.quadStream(rdf.dataset().toStream())
        } catch (err) {
          error = err
        }

        next()
      })

      await request(app).get('/')
        .set('accept', 'text/plain')

      assert(error)
    })

    it('should forward options to the serializer', async () => {
      let givenOptions = null
      const options = {}
      const app = express()
      const customFormats = formatsMock({
        serialize: (quadStream, options) => {
          givenOptions = options
        }
      })

      app.use(rdfHandler({ formats: customFormats }))
      app.use(async (req, res, next) => {
        await res.quadStream(toStream(rdf.dataset()), options)

        next()
      })

      await request(app).get('/')
        .set('accept', 'text/plain')

      assert.strictEqual(givenOptions, options)
    })
  })
})
