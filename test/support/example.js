const rdf = require('@rdfjs/dataset')
const { toCanonical } = require('rdf-dataset-ext')

const dataset = rdf.dataset([
  rdf.quad(
    rdf.namedNode('http://example.org/subject'),
    rdf.namedNode('http://example.org/predicate'),
    rdf.literal('object'))
])

const nt = toCanonical(dataset)

module.exports = {
  dataset,
  nt
}
