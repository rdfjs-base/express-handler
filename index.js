import defaultFormats from '@rdfjs/formats-common'
import httpError from 'http-errors'
import Environment from '@rdfjs/environment'
import DataFactory from '@rdfjs/environment/DataFactory.js'
import DatasetFactory from '@rdfjs/environment/DatasetFactory.js'
import fromStream from 'rdf-dataset-ext/fromStream.js'
import toStream from 'rdf-dataset-ext/toStream.js'
import TripleToQuad from 'rdf-transform-triple-to-quad'
import { promisify } from 'util'
import { PassThrough } from 'readable-stream'
import absoluteUrl from 'absolute-url'
import once from 'once'

const rdf = new Environment([DatasetFactory, DataFactory])

async function buildOptions (req, userOptions, getBaseIri) {
  const options = { ...userOptions }

  if (getBaseIri) {
    options.baseIRI = await getBaseIri(req)
  }

  return options
}

async function readDataset ({ factory, options, req, getBaseIri }) {
  const parserOptions = await buildOptions(req, options, getBaseIri)

  return fromStream(factory.dataset(), req.quadStream(parserOptions))
}

function readQuadStream ({ formats, mediaType, options, req, getBaseIri }) {
  const passThrough = new PassThrough({ objectMode: true })
  Promise.resolve().then(async () => {
    const parserOptions = await buildOptions(req, options, getBaseIri)

    const parserStream = formats.parsers.import(mediaType, req, parserOptions)
    parserStream.on('error', parseError => {
      passThrough.emit('error', httpError(400, parseError, {
        statusCode: 400,
        status: 'Bad Request'
      }))
    })

    parserStream.pipe(passThrough)
  })

  return passThrough
}

async function sendDataset ({ dataset, options, res }) {
  await res.quadStream(toStream(dataset), options)
}

async function sendQuadStream ({ defaultMediaType, formats, options, quadStream, req, res, sendTriples }) {
  // check accept header against list of serializers
  const accepts = req.accepts([...formats.serializers.keys()])

  // content type header was already set?
  const contentType = res.get('content-type') && res.get('content-type').split(';')[0]

  // content type header can be used to force the media type, accept header is used otherwise and default as fallback
  const mediaType = contentType || accepts || defaultMediaType

  const serializer = formats.serializers.get(mediaType)

  // if no matching serializer can be found -> 406 not acceptable
  if (!serializer) {
    throw new httpError.NotAcceptable('no matching serializer found')
  }

  res.set('content-type', mediaType + '; charset=utf-8')

  if (sendTriples) {
    quadStream = quadStream.pipe(new TripleToQuad())
  }

  const serializedStream = formats.serializers.import(mediaType, quadStream, options)

  serializedStream.pipe(res)

  await new Promise((resolve, reject) => {
    res.on('finish', resolve)
    res.on('error', reject)
    serializedStream.on('error', reject)
  })
}

function init ({ factory = rdf, formats = defaultFormats, defaultMediaType, baseIriFromRequest, sendTriples } = {}) {
  let getBaseIri

  if (baseIriFromRequest === true) {
    getBaseIri = (req) => {
      absoluteUrl.attach(req)

      return req.absoluteUrl()
    }
  } else if (typeof baseIriFromRequest === 'function') {
    getBaseIri = baseIriFromRequest
  }

  // middleware
  return (req, res, next) => {
    res.dataset = async (dataset, options) => {
      await sendDataset({ dataset, options, res })
    }

    res.quadStream = async (quadStream, options) => {
      await sendQuadStream({
        formats,
        options,
        quadStream,
        req,
        res,
        sendTriples
      })
    }

    const contentType = req.get('content-type')

    // only process body if content type header was set
    if (!contentType) {
      return next()
    }

    const mediaType = contentType || defaultMediaType

    // don't attach methods at all if there is no matching parser for the media type
    if (!formats.parsers.has(mediaType)) {
      return next()
    }

    req.dataset = once(options => readDataset({ factory, options, req, getBaseIri }))

    req.quadStream = options => readQuadStream({ formats, mediaType, options, req, getBaseIri })

    next()
  }
}

init.attach = async (req, res, options) => {
  if (req.dataset || req.quadStream || res.dataset || res.quadStream) {
    return
  }

  return promisify(init(options))(req, res)
}

export default init
