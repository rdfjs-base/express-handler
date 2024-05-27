# @rdfjs/express-handler

[![build status](https://img.shields.io/github/actions/workflow/status/rdfjs-base/express-handler/test.yaml?branch=master)](https://github.com/rdfjs-base/express-handler/actions/workflows/test.yaml)
[![npm version](https://img.shields.io/npm/v/@rdfjs/express-handler.svg)](https://www.npmjs.com/package/@rdfjs/express-handler)

The `@rdfjs/express-handler` middleware provides methods to parse incoming RDF data from request with content like `POST` or `PUT` requests.
It also provides methods to serialize outgoing RDF data.   

## Usage

The package returns a factory function to create express middlewares.

### Factory

Adding it to all routes of the app would look like this:

```
import express from 'express'
import rdfHandler from '@rdfjs/express-handler'

const app = express()

app.use(rdfHandler())
```

The factory accepts the following options:

- `factory`: The factory used to create Dataset instances. Default: `require('rdf-ext')`
- `formats`: An object with `parsers` and `serializers`, each given as `@rdfjs/sink-map`. Default: `require('@rdfjs/formats-common')`
- `defaultMediaType`: If an unknown Content-Type is given, this media type will be used. Default: `undefined`
- `baseIriFromRequest`: If `true`, will call [absolute-url](https://npm.im/absolute-url) to get the requested IRI and pass as base IRI to the parser.
  It can also be a function `async (req) => string` which can be used to compute the base IRI for the parser.
- `sendTriples`: If `true`, the RDF/JS Quads sent using `res.dataset()` or `res.quadStream()` are converted to triples (default graph). Default `undefined`.

### Request

Routes following the RDF Handler can access the parsed Quads from the request as a Stream or Dataset.
The `req.dataset()` and `req.quadStream()` methods can be used for this.
But the methods are only attached if the request contains content in a type supported by one of the parsers.
The logic to access the Quads could look like this:

```
app.use((req, res) => {
  if (!req.dataset) {
    return res.status(406).end() // send 406 not acceptable if the content can't be parsed
  }

  const dataset = await req.dataset()
})
```

`req.dataset()` requires `await` as it's an async method.
`req.quadStream()` is a sync method.
Both methods accept an options object, which is forwarded to the parser.

### Response

The RDF Handler middleware always attaches the `res.dataset()` and `res.quadStream()` methods.
The methods must be called with the Dataset or Stream, which should be sent.
A second options object can be given, which will be forwarded to the serializer.
Sending a Dataset would look like this:

```
app.use((req, res) => {
  await res.dataset(dataset)
})
```

Both methods are async and finished once the response was sent.

### Attaching

If you don't know if `@rdfjs/express-handler` is used earlier in the application, it's possible to attach it dynamically.
That is useful inside of a middleware where you want to use an application RDF Handler instance and it's options, but fallback to a local instance if there is no RDF Handler earlier in the routes.
The `.attach()` function can be used.
`await` must be used, as it's an async function. 

```
app.use((req, res) => {
  await rdfHandler.attach(req, res)

  if (req.dataset) {
    const dataset = await req.dataset()
  }

  await res.dataset(rdf.dataset())
})
```
