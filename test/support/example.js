const rdf = require('rdf-ext')

const dataset = rdf.dataset([
  rdf.quad(
    rdf.namedNode('http://example.org/subject'),
    rdf.namedNode('http://example.org/predicate'),
    rdf.literal('object'))
])

const nt = dataset.toString()

module.exports = {
  dataset,
  nt
}
