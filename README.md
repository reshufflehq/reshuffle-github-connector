# reshuffle-github-connector

[Code](https://github.com/reshufflehq/reshuffle-github-connector) | [npm](https://www.npmjs.com/package/reshuffle-github-connector) | [Code sample](https://github.com/reshufflehq/reshuffle/tree/master/examples/github)

`npm install reshuffle-github-connector`

This connector uses the [Octokit GitHub REST API](https://github.com/octokit/rest.js) package.

### Reshuffle GitHub Connector

This connector provides a connector for [GitHub](https://www.github.com).

The following example listens to all GitHub events on a repository:

```js
const { Reshuffle } = require('reshuffle')
const { GitHubConnector } = require('reshuffle-github-connector')

const app = new Reshuffle()
const connector = new GitHubConnector(app, {
  token: process.env.TOKEN,
  owner: process.env.OWNER,
  baseUrl: process.env.BASE_URL,
  repo: process.env.REPO,
})

connector.on({ githubEvent: '*' }, (event) => {
  console.log('GitHub Event: ', event)
})

app.start()
```

Create an API token from your GitHub account:

1. Log in and go to https://github.com/settings/tokens.
2. Click "Generate new token".
3. Click Copy to clipboard, then paste the token to your script, or elsewhere to save

#### Configuration Options:

Provide options as below for connecting to Jira:

```typescript
const connector = new GitHubConnector(app, {
  owner: 'reshufflehq',
  repo: 'reshuffle',
})
```

To use GitHub connector events, you need to provide at least your runtime baseURL.
You can also override the default webhookPath and webhookName.

```typescript
interface GithubConnectorConfigOptions {
  owner: string
  repo: string
  secret?: string
  webhookPath?: string
  baseUrl?: string
  token?: string
}

// Full list of available options to connect to Octokit GitHub Rest API
type OctokitOptions = {
  authStrategy?: any
  auth?: any
  userAgent?: string
  previews?: string[]
  baseUrl?: string
  log?: {
    debug: (message: string) => unknown
    info: (message: string) => unknown
    warn: (message: string) => unknown
    error: (message: string) => unknown
  }
  request?: OctokitTypes.RequestRequestOptions
  timeZone?: string
  [option: string]: any
}
```

#### Connector events

##### listening to GitHub events

To listen to events happening in GitHub, pass the GitHub event type as options

```typescript
interface GitHubConnectorEventOptions {
  githubAction?: WebhookEvents | WebhookEvents[]
}

// From: https://developer.github.com/webhooks/event-payloads/#webhook-event-payloads
type WebhookEvents =
  | 'check_run'
  | 'check_suite'
  | 'commit_comment'
  | 'content_reference'
  | 'create'
  | 'delete'
  | 'deploy_key'
  | 'deployment'
  | 'deployment_status'
  | 'fork'
  | 'github_app_authorization'
  | 'gollum'
  | 'installation'
  | 'installation_repositories'
  | 'issue_comment'
  | 'issues'
  | 'label'
  | 'marketplace_purchase'
  | 'member'
  | 'membership'
  | 'meta'
  | 'milestone'
  | 'organization'
  | 'org_block'
  | 'package'
  | 'page_build'
  | 'ping'
  | 'project_card'
  | 'project_column'
  | 'project'
  | 'public'
  | 'pull_request'
  | 'pull_request_review'
  | 'pull_request_review_comment'
  | 'push'
  | 'release'
  | 'repository_dispatch'
  | 'repository'
  | 'repository_import'
  | 'repository_vulnerability_alert'
  | 'security_advisory'
  | 'sponsorship'
  | 'star'
  | 'status'
  | 'team'
  | 'team_add'
  | 'watch'
```

#### Connector actions

All actions are provided via the sdk.
// See full list of actions with documentation [Octokit GitHub Rest.js Documentation](https://octokit.github.io/rest.js/v18)

Few examples:

- Get the issues for a repository

```typescript
const repoIssues = await connector.sdk().issues.get({
  owner,
  repo,
  issue_number,
})
```

- Create a pull request

```typescript
const pullRequest = await connector.sdk().pulls.create({
  owner,
  repo,
  title,
  head,
  base,
})
```

- Follow another user:

```typescript
const user = await connector.sdk().users.follow({
  username,
})
```

##### sdk

Full access to the Octokit GitHub Rest Client

```typescript
const sdk = await connector.sdk()
```
