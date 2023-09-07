import SinkMap from '@rdfjs/sink-map'
import { Readable } from 'stream'

export default function formatsMock ({ parse, serialize }) {
  const formats = {
    parsers: new SinkMap(),
    serializers: new SinkMap()
  }

  formats.parsers.set('text/plain', {
    import: (stream, options) => {
      const output = new Readable({
        read: () => {}
      })

      const content = parse(stream, options)

      if (content) {
        output.push(content)
      }

      output.push(null)

      return output
    }
  })

  formats.serializers.set('text/plain', {
    import: (quadStream, options) => {
      const output = new Readable({
        read: () => {}
      })

      const content = serialize(quadStream, options)

      if (content) {
        output.push(content)
      }

      output.push(null)

      return output
    }
  })

  return formats
}
