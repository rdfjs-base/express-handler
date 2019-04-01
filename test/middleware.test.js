/* global describe, it */

const assert = require('assert')
const example = require('./support/example')
const express = require('express')
const rdfHandler = require('../')
const request = require('supertest')

describe('middleware', () => {
  it('should return a middleware function', () => {
    const middleware = rdfHandler()

    assert.strictEqual(typeof middleware, 'function')
    assert.strictEqual(middleware.length, 3)
  })

  describe('.attach', () => {
    it('should do nothing if there is already a .dataset and .quadStream method', async () => {
      const app = express()

      app.use(async (req, res, next) => {
        const readDataset = () => {}
        const readQuadStream = () => {}
        const sendDataset = () => {}
        const sendQuadStream = () => {}

        req.dataset = readDataset
        req.quadStream = readQuadStream

        res.dataset = sendDataset
        res.quadStream = sendQuadStream

        await rdfHandler.attach(req, res)

        assert.strictEqual(req.dataset, readDataset)
        assert.strictEqual(req.quadStream, readQuadStream)
        assert.strictEqual(res.dataset, sendDataset)
        assert.strictEqual(res.quadStream, sendQuadStream)

        next()
      })

      await request(app).post('/')
        .set('content-type', 'application/n-triples')
        .send(example.nt)
    })

    it('should attach methods', async () => {
      const app = express()

      app.use(async (req, res, next) => {
        await rdfHandler.attach(req, res)

        assert.strictEqual(typeof req.dataset, 'function')
        assert.strictEqual(typeof req.quadStream, 'function')
        assert.strictEqual(typeof res.dataset, 'function')
        assert.strictEqual(typeof res.quadStream, 'function')

        next()
      })

      await request(app).post('/')
        .set('content-type', 'application/n-triples')
        .send(example.nt)
    })
  })
})
