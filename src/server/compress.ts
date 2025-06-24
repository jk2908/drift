import fs from 'node:fs/promises'
import path from 'node:path'
import { brotliCompress } from 'node:zlib'

/**
 * Compress a file or directory
 * @param input - The input file or directory
 * @param config - The configuration for the compression
 * @param config.filter - A filter function to determine which files to compress
 * @returns The compressed file or directory
 */
export async function* compress(
  input: string,
  config: {
    filter?: (f: string) => boolean
  } = {},
): AsyncGenerator<{
  input: string
  compressed: Uint8Array
}> {
  try {
    const { filter = f => /\.(js|css|html|svg|json|txt)$/.test(f) } = config
    const stat = await fs.stat(input)

    if (stat.isDirectory()) {
      for (const entry of await fs.readdir(input)) {
        yield* compress(path.join(input, entry), config)
      }
    } else if (filter(input)) {
      const file = Bun.file(input)
      const buffer = Buffer.from(await file.arrayBuffer())

      const compressed: Buffer = await new Promise((fulfill, reject) => {
        brotliCompress(buffer, (err, res) => {
          if (err) {
            reject(err)
          } else {
            fulfill(res)
          }
        })
      })

      yield {
        input,
        compressed: new Uint8Array(compressed.buffer),
      }
    }
  } catch (err) {
    console.error('framework:compress:compress* error compressing', err)
    throw err
  }
}