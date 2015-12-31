# rdf-body-parser

The `rdf-body-parser` middleware parses incoming RDF data, parses it and attaches it with the property `.graph` to the request object.
It also attaches the `.sendGraph` function to the response to send a graph in the requested format.

## Usage

Import the module:

    var rdfBodyParser = require('rdf-body-parser')

Also import the commons format bundle. The formats parameter is required!

    var rdfFormats = require('rdf-formats-common')()

The rdf-body-parser module returns a function to create a middleware. So let's call that function:

    app.use(rdfBodyParser(rdfFormats))

Now you can use the `.graph` property and `.sendGraph` function:

    app.use(function (req, res, next) {
       // .graph contains the parsed graph
       if (req.graph) {
         console.log(req.graph.toString())
       }

       // .sendGraph sends a graph to the client
       res.sendGraph(rdf.createGraph())
    })
