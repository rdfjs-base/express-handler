# rdf-body-parser

[![Build Status](https://travis-ci.org/rdf-ext/rdf-body-parser.svg?branch=master)](https://travis-ci.org/rdf-ext/rdf-body-parser)
[![npm version](https://badge.fury.io/js/rdf-body-parser.svg)](https://badge.fury.io/js/rdf-body-parser)

The `rdf-body-parser` middleware parses incoming RDF data, parses it and attaches it with the property `.graph` to the request object.
It also attaches the `.graph` function to the response to send a graph in the requested format.

## Usage

Import the module:

    const rdfBodyParser = require('rdf-body-parser')

The `rdf-body-parser` module returns a function to create a middleware. So let's call that function:

    app.use(rdfBodyParser())

Now you can use the `.graph` property and `.graph` function:

    app.use((req, res, next) => {
       // .graph contains the parsed graph
       if (req.graph) {
         console.log(req.graph.toString())
       }

       // .graph sends a graph to the client
       res.graph(rdf.dataset())
    })

### Attaching

If you don't know if `rdf-body-parser` is used as middleware, it's possible to attach it dynamically.
That is useful inside of a middleware where you want to use an application specific instance (with application options) or the default one.
`.attach` has no callback parameter, instead it returns a `Promise`.

    app.use((req, res, next) => {
      rdfBodyParser.attach(req, res).then(() => {
        if (req.graph) {
          console.log(req.graph.toString())
        }

        res.graph(rdf.dataset())
      })
    })
