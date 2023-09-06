import express from 'express'
import rdf from 'rdf-ext'
import rdfHandler from '../index.js'

const app = express()

app.post('/', rdfHandler(), async (req, res) => {
  // send a 406 not acceptable error if the content has an unknown type
  if (!req.quadStream) {
    return res.status(406).end()
  }

  // get the stream for the incoming quads
  // use the rdf-ext factory to have a .toString method on the quads
  const quadStream = await req.quadStream({ factory: rdf })

  // write any incoming quads to the console
  quadStream.on('data', quad => {
    console.log(quad.toString())
  })

  // and directly forward it to the response
  await res.quadStream(quadStream)
})

app.listen(8080, () => {
  console.log('send some data using curl like this: curl -v -X POST -H "content-type: text/turtle" -H "accept: text/turtle" -d "<http://example.org/subject> <http://example.org/predicate> \\"object\\" ." http://localhost:8080/')
})
