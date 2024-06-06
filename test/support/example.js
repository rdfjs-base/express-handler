import rdf from 'rdf-ext'

export const dataset = rdf.dataset([
  rdf.quad(
    rdf.namedNode('http://example.org/subject'),
    rdf.namedNode('http://example.org/predicate'),
    rdf.literal('object'))
])

export const nt = dataset.toCanonical()
