const defaultFormats = require('@rdfjs/formats-common')
const httpErrors = require('http-errors')
const rdf = require('@rdfjs/dataset')
const { fromStream, toStream } = require('rdf-dataset-ext')
const { promisify } = require('util')
const { PassThrough } = require('readable-stream')
const absoluteUrl = require('absolute-url')

async function readDataset ({ factory, options, req }) {
  return fromStream(factory.dataset(), req.quadStream(options))
}

function readQuadStream ({ formats, mediaType, options, req }) {
  return formats.parsers.import(mediaType, req, options)
}

async function sendDataset ({ dataset, options, res }) {
  await res.quadStream(toStream(dataset), options)
}

async function sendQuadStream ({ defaultMediaType, formats, options, quadStream, req, res }) {
  // check accept header against list of serializers
  const accepts = req.accepts([...formats.serializers.keys()])

  // content type header was already set?
  const contentType = res.get('content-type') && res.get('content-type').split(';')[0]

  // content type header can be used to force the media type, accept header is used otherwise and default as fallback
  const mediaType = contentType || accepts || defaultMediaType

  const serializer = formats.serializers.get(mediaType)

  // if no matching serializer can be found -> 406 not acceptable
  if (!serializer) {
    throw new httpErrors.NotAcceptable('no matching serializer found')
  }

  res.set('content-type', mediaType + '; charset=utf-8')

  const serializedStream = formats.serializers.import(mediaType, quadStream, options)

  serializedStream.pipe(res)

  await new Promise((resolve, reject) => {
    res.on('finish', resolve)
    res.on('error', reject)
    serializedStream.on('error', reject)
  })
}

function init ({ factory = rdf, formats = defaultFormats, defaultMediaType, baseIriFromRequest } = {}) {
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
      await sendQuadStream({ formats, options, quadStream, req, res })
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

    req.dataset = async userOptions => {
      const options = { ...userOptions }
      if (getBaseIri) {
        options.baseIRI = await getBaseIri(req)
      }

      return readDataset({ factory, options, req })
    }

    req.quadStream = userOptions => {
      const options = { ...userOptions }

      if (getBaseIri) {
        const passThrough = new PassThrough()
        Promise.resolve().then(async () => {
          options.baseIRI = getBaseIri(req)

          readQuadStream({ formats, mediaType, options, req }).pipe(passThrough)
        })

        return passThrough
      }

      return readQuadStream({ formats, mediaType, options, req })
    }

    next()
  }
}

init.attach = async (req, res, options) => {
  if (req.dataset || req.quadStream || res.dataset || res.quadStream) {
    return
  }

  return promisify(init(options))(req, res)
}

module.exports = init
