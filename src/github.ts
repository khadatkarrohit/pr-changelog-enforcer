import { GitHub } from '@actions/github/lib/utils'

type Octokit = InstanceType<typeof GitHub>

export async function getPRFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<string[]> {
  const files: string[] = []
  let page = 1

  while (true) {
    const { data } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
      page
    })
    files.push(...data.map(f => f.filename))
    if (data.length < 100) break
    page++
  }

  return files
}

export async function getPRLabels(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<string[]> {
  const { data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber
  })
  return data.labels.map(l => l.name)
}

export async function getPRAuthor(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<string> {
  const { data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber
  })
  return data.user?.login ?? ''
}

export async function getFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  filePath: string,
  ref: string
): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref
    })
    if ('content' in data && typeof data.content === 'string') {
      return Buffer.from(data.content, 'base64').toString('utf-8')
    }
    return null
  } catch {
    return null
  }
}
