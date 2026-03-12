export interface ChangelogParseResult {
  hasUnreleasedSection: boolean
  unreleasedLines: string[]
}

export function getUnreleasedSection(content: string): string {
  const lines = content.split('\n')
  let inUnreleased = false
  const section: string[] = []

  for (const line of lines) {
    if (/^##\s+\[unreleased\]/i.test(line)) {
      inUnreleased = true
      continue
    }
    if (inUnreleased && /^##\s+\[/.test(line)) {
      break
    }
    if (inUnreleased) {
      section.push(line)
    }
  }

  return section.join('\n')
}

export function parseChangelog(content: string): ChangelogParseResult {
  const hasUnreleasedSection = /^##\s+\[unreleased\]/im.test(content)
  const unreleasedLines = getUnreleasedSection(content)
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  return { hasUnreleasedSection, unreleasedLines }
}

export function hasNewEntry(baseContent: string, prContent: string): boolean {
  const baseSection = getUnreleasedSection(baseContent)
  const prSection = getUnreleasedSection(prContent)

  const baseLines = new Set(
    baseSection.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  )
  const prLines = prSection.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  // at least one new non-empty line was added to the unreleased section
  return prLines.some(line => !baseLines.has(line))
}

export function hasNewVersionSection(baseContent: string, prContent: string): boolean {
  const versionRegex = /^##\s+\[\d+\.\d+\.\d+\]/gm
  const baseVersions = (baseContent.match(versionRegex) || []).map(v => v.trim())
  const prVersions = (prContent.match(versionRegex) || []).map(v => v.trim())

  return prVersions.some(v => !baseVersions.includes(v))
}
