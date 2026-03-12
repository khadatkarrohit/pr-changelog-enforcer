import * as core from '@actions/core'
import * as github from '@actions/github'
import { minimatch } from 'minimatch'
import { getPRFiles, getPRLabels, getPRAuthor, getFileContent } from './github'
import { parseChangelog, hasNewEntry, hasNewVersionSection } from './changelog'

const KNOWN_BOTS = ['dependabot[bot]', 'renovate[bot]', 'github-actions[bot]', 'dependabot', 'renovate']

function matchesAnyPattern(filePath: string, patterns: string[]): boolean {
  return patterns.some(p => minimatch(filePath, p, { matchBase: true }))
}

async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token', { required: true })
    const changelogFile = core.getInput('changelog-file') || 'CHANGELOG.md'
    const skipLabel = core.getInput('skip-label') || 'skip-changelog'
    const exemptBots = core.getInput('exempt-bots') !== 'false'
    const exemptPathsInput = core.getInput('exempt-paths') || ''
    const requireUnreleased = core.getInput('require-unreleased-section') !== 'false'

    const exemptPatterns = exemptPathsInput
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0)

    const octokit = github.getOctokit(token)
    const ctx = github.context

    if (!ctx.payload.pull_request) {
      core.info('Not a pull request event, skipping.')
      return
    }

    const { number: pullNumber, base, head } = ctx.payload.pull_request
    const { owner, repo } = ctx.repo

    // check if author is a known bot
    const author = await getPRAuthor(octokit, owner, repo, pullNumber)
    if (exemptBots && KNOWN_BOTS.includes(author)) {
      core.info(`PR author '${author}' is a bot — skipping changelog enforcement.`)
      return
    }

    // check skip label
    const labels = await getPRLabels(octokit, owner, repo, pullNumber)
    if (labels.includes(skipLabel)) {
      core.info(`PR has '${skipLabel}' label — skipping changelog enforcement.`)
      return
    }

    // get changed files
    const changedFiles = await getPRFiles(octokit, owner, repo, pullNumber)
    core.info(`Changed files: ${changedFiles.join(', ')}`)

    // check if all changed files match exempt paths
    if (exemptPatterns.length > 0) {
      const allExempt = changedFiles.every(f => matchesAnyPattern(f, exemptPatterns))
      if (allExempt) {
        core.info('All changed files match exempt paths — skipping changelog enforcement.')
        return
      }
    }

    // check changelog was modified
    const changelogModified = changedFiles.includes(changelogFile)
    if (!changelogModified) {
      core.setFailed(
        `❌ ${changelogFile} was not updated in this PR.\n` +
        `Please add an entry under the ## [Unreleased] section, or add the '${skipLabel}' label to skip this check.`
      )
      return
    }

    if (!requireUnreleased) {
      core.info(`✅ ${changelogFile} was modified.`)
      return
    }

    // fetch changelog content from base and head
    const baseContent = await getFileContent(octokit, owner, repo, changelogFile, base.sha)
    const headContent = await getFileContent(octokit, owner, repo, changelogFile, head.sha)

    if (!headContent) {
      core.setFailed(`Could not read ${changelogFile} from PR branch.`)
      return
    }

    const { hasUnreleasedSection } = parseChangelog(headContent)

    if (!hasUnreleasedSection) {
      core.setFailed(
        `❌ ${changelogFile} does not have an ## [Unreleased] section.\n` +
        `Add your changes under ## [Unreleased] to pass this check.`
      )
      return
    }

    // compare base vs head unreleased section
    const newEntryAdded = baseContent
      ? hasNewEntry(baseContent, headContent) || hasNewVersionSection(baseContent, headContent)
      : parseChangelog(headContent).unreleasedLines.length > 0

    if (!newEntryAdded) {
      core.setFailed(
        `❌ No new entry found in the ## [Unreleased] section of ${changelogFile}.\n` +
        `Please document your changes — even a one-liner is enough.`
      )
      return
    }

    core.info(`✅ Changelog is up to date.`)
  } catch (err) {
    core.setFailed(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
  }
}

run()
