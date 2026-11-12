import { describe, expect, it } from 'vitest'
import { formatBytes, MAX_FILE_BYTES, storagePathFor, validateFile } from './fileTypes'

describe('validateFile', () => {
  it.each(['brief.pdf', 'Plan.DOCX', 'old.doc', 'notes.txt', 'data.csv', 'budget.xlsx'])(
    'accepts %s',
    (name) => {
      expect(validateFile({ name, size: 1000 }).ok).toBe(true)
    },
  )

  it.each(['photo.png', 'script.exe', 'archive.zip', 'noextension', 'sheet.xls'])(
    'rejects %s',
    (name) => {
      const result = validateFile({ name, size: 1000 })
      expect(result.ok).toBe(false)
    },
  )

  it('rejects empty and oversized files', () => {
    expect(validateFile({ name: 'a.pdf', size: 0 })).toMatchObject({ ok: false })
    expect(validateFile({ name: 'a.pdf', size: MAX_FILE_BYTES + 1 })).toMatchObject({ ok: false })
    expect(validateFile({ name: 'a.pdf', size: MAX_FILE_BYTES }).ok).toBe(true)
  })

  it('uses a canonical MIME type regardless of what the browser reports', () => {
    expect(validateFile({ name: 'data.csv', size: 10 })).toEqual({
      ok: true,
      fileType: 'csv',
      mime: 'text/csv',
    })
  })
})

describe('storagePathFor', () => {
  it('places files under the workspace folder with a safe name', () => {
    expect(storagePathFor('ws-1', 'My Project Brief (v2).pdf', 'abc')).toBe(
      'ws-1/abc-My-Project-Brief-v2.pdf',
    )
  })

  it('strips path traversal characters', () => {
    expect(storagePathFor('ws-1', '../../etc/passwd.txt', 'id')).toBe(
      'ws-1/id-..-..-etc-passwd.txt',
    )
    expect(storagePathFor('ws-1', '../../etc/passwd.txt', 'id').startsWith('ws-1/')).toBe(true)
  })
})

describe('formatBytes', () => {
  it('formats sizes', () => {
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
