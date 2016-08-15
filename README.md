# rdf-body-parser

The `rdf-body-parser` middleware parses incoming RDF data, parses it and attaches it with the property `.graph` to the request object.
It also attaches the `.sendGraph` function to the response to send a graph in the requested format.

## Usage

Import the module:

    var rdfBodyParser = require('rdf-body-parser')

The rdf-body-parser module returns a function to create a middleware. So let's call that function:

    app.use(rdfBodyParser())

Now you can use the `.graph` property and `.sendGraph` function:

    app.use(function (req, res, next) {
       // .graph contains the parsed graph
       if (req.graph) {
         console.log(req.graph.toString())
       }

       // .sendGraph sends a graph to the client
       res.sendGraph(rdf.createGraph())
    })

Attaching

If you don't know if rdf-body-parser is used as middleware, it's possible to attach it dynamically.
That is usefull inside of a middleware where you want to use an application specific instance (with options) or the default one.
`.attach` has no callback parameter, instead it returns a `Promise`.

    app.use(function (req, res, next) {
      rdfBodyParser.attach(req, res).then(function () {
        if (req.graph) {
          console.log(req.graph.toString())
        }

        res.sendGraph(rdf.createGraph())
      })
    })
