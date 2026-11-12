import { Buffer } from 'node:buffer'
import { extractText, getDocumentProxy } from 'npm:unpdf@2.1.0'
import mammoth from 'npm:mammoth@1.13.0'
// SheetJS is published on its own CDN; the npm "xlsx" package is outdated.
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs'

/** An extraction problem that is safe to show to the user. */
export class ExtractionError extends Error {}

const MIN_TEXT_CHARS = 40

export async function extractDocumentText(bytes: Uint8Array, fileType: string): Promise<string> {
  let text: string
  switch (fileType) {
    case 'pdf': {
      const pdf = await getDocumentProxy(bytes)
      const result = await extractText(pdf, { mergePages: true })
      text = Array.isArray(result.text) ? result.text.join('\n\n') : result.text
      break
    }
    case 'docx': {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
      text = result.value
      break
    }
    case 'txt':
    case 'csv':
      text = new TextDecoder('utf-8').decode(bytes)
      break
    case 'xlsx': {
      const workbook = XLSX.read(bytes, { type: 'array' })
      text = workbook.SheetNames.map(
        (name: string) => `# Sheet: ${name}\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`,
      ).join('\n\n')
      break
    }
    case 'doc':
      throw new ExtractionError(
        'Older .doc files cannot be read yet. Save the document as .docx and upload it again.',
      )
    default:
      throw new ExtractionError(`Unsupported file type: ${fileType}`)
  }

  text = text
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (text.length < MIN_TEXT_CHARS) {
    throw new ExtractionError(
      fileType === 'pdf'
        ? 'No readable text was found. This looks like a scanned PDF; scanned documents need OCR, which is not supported yet.'
        : 'The document does not contain enough readable text to build a plan.',
    )
  }
  return text
}
