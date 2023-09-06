import datasetFactory from '@rdfjs/dataset'
import rdf from '@rdfjs/data-model'
import toCanonical from 'rdf-dataset-ext/toCanonical.js'

export const dataset = datasetFactory.dataset([
  rdf.quad(
    rdf.namedNode('http://example.org/subject'),
    rdf.namedNode('http://example.org/predicate'),
    rdf.literal('object'),
    rdf.namedNode('http://example.org/graph'))
])

export const nq = toCanonical(dataset)
