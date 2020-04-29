const rdf = require('@rdfjs/dataset')
const { toCanonical } = require('rdf-dataset-ext')

const dataset = rdf.dataset([
  rdf.quad(
    rdf.namedNode('http://example.org/subject'),
    rdf.namedNode('http://example.org/predicate'),
    rdf.literal('object'),
    rdf.namedNode('http://example.org/graph'))
])

const nq = toCanonical(dataset)

module.exports = {
  dataset,
  nq
}
