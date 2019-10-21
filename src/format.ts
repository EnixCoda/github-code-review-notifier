export const mention = (userID: string | null) => `<@${userID}>`

export const slackLink = (url: string, label: string) => `<${url}|${label}>`

export const githubUserPage = (githubName: string) => `https://github.com/${githubName}`

export const githubUserPageLink = (githubName: string) =>
  slackLink(githubUserPage(githubName), githubName)

export function pullRequestLabel(
  number: number,
  pullRequestTitle: string,
  repoName: string,
): string {
  return `*#${number} ${pullRequestTitle.replace(/\+/g, ' ')}* in ${repoName}`
}
