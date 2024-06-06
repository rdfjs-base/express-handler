import rdf from 'rdf-ext'

export const dataset = rdf.dataset([
  rdf.quad(
    rdf.namedNode('http://example.org/subject'),
    rdf.namedNode('http://example.org/predicate'),
    rdf.literal('object'),
    rdf.namedNode('http://example.org/graph'))
])

export const nq = dataset.toCanonical()
