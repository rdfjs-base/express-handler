const express = require('express')
const rdfHandler = require('..')

const app = express()

app.post('/', rdfHandler(), async (req, res) => {
  // send a 406 not acceptable error if the content has an unknown type
  if (!req.dataset) {
    return res.status(406).end()
  }

  // read the incoming dataset
  const dataset = await req.dataset()

  // write the incoming dataset to the console
  console.log(dataset.toString())

  // send the same dataset in the response
  await res.dataset(dataset)
})

app.listen(8080, () => {
  console.log('send some data using curl like this: curl -v -X POST -H "content-type: text/turtle" -H "accept: text/turtle" -d "<http://example.org/subject> <http://example.org/predicate> \\"object\\" ." http://localhost:8080/')
})
