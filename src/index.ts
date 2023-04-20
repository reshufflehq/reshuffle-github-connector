import { Reshuffle, EventConfiguration, BaseHttpConnector } from 'reshuffle-base-connector'
import { Octokit, RestEndpointMethodTypes } from '@octokit/rest'
import { verify } from '@octokit/webhooks'
import type { Request, Response } from 'express'

const DEFAULT_WEBHOOK_PATH = '/reshuffle-github-connector/webhook'

type OctokitOptions = NonNullable<ConstructorParameters<typeof Octokit>[0]>

// From: https://developer.github.com/webhooks/event-payloads/#webhook-event-payloads
export type GithubEvent =
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

export interface GitHubConnectorConfigOptions extends OctokitOptions {
  secret?: string
  webhookPath?: string
  runtimeBaseUrl?: string
  token?: string
  baseUrl?: string
}

export interface GitHubConnectorEventOptions {
  owner: string
  repo: string
  githubEvent: GithubEvent
}

function validateBaseURL(url?: string): string {
  if (typeof url !== 'string') {
    throw new Error(`Invalid url: ${url}`)
  }
  const match = url.match(/^(https:\/\/[\w-]+(\.[\w-]+)*(:\d{1,5})?)\/?$/)
  if (!match) {
    throw new Error(`Invalid url: ${url}`)
  }
  return match[1]
}

export default class GitHubConnector extends BaseHttpConnector<
  GitHubConnectorConfigOptions,
  GitHubConnectorEventOptions
> {
  // Your class variables
  private _sdk: Octokit

  constructor(app: Reshuffle, options: GitHubConnectorConfigOptions, id?: string) {
    super(app, options, id)
    this._sdk = new Octokit({
      auth: options?.token && `token ${options.token}`,
      baseUrl: options?.baseUrl,
    })
  }

  async onStart(): Promise<void> {
    const logger = this.app.getLogger()
    const events = Object.values(this.eventConfigurations)

    if (events.length) {
      const baseUrl = validateBaseURL(this.configOptions?.runtimeBaseUrl)
      const githubEvents = events.reduce<Record<string, GithubEvent[]>>(
        (acc, { options: { owner, repo, githubEvent } }) => {
          const repoEvents = acc[`${owner}/${repo}`] || []
          return {
            ...acc,
            [`${owner}/${repo}`]: [...repoEvents, githubEvent],
          }
        },
        {},
      )

      for (const [key, events] of Object.entries(githubEvents)) {
        const [owner, repo] = key.split('/')

        const webhookOptions: RestEndpointMethodTypes['repos']['createWebhook']['parameters'] = {
          events,
          repo,
          config: {
            url: baseUrl + (this.configOptions?.webhookPath || DEFAULT_WEBHOOK_PATH),
            secret: this.configOptions.secret,
            insecure_ssl: '0',
            content_type: 'json',
          },
          owner,
        }

        const webhooks = await this._sdk.repos.listWebhooks({
          owner,
          repo,
        })

        const existingWebhook = webhooks.data.find(
          ({ events: existingEvents, config: existingConfig }) => {
            if (
              existingConfig.url === webhookOptions.config.url &&
              existingConfig.content_type === webhookOptions.config.content_type &&
              existingConfig.insecure_ssl === webhookOptions.config.insecure_ssl
            ) {
              const eventsNotRegistered = events?.filter((ev) => !existingEvents.includes(ev))
              return eventsNotRegistered?.length === 0
            }

            return false
          },
        )

        if (existingWebhook) {
          logger.info(
            `Reshuffle GitHub - existing webhook reused (name: ${existingWebhook.name}, url: ${existingWebhook.url})`,
          )
        } else {
          const webhook = (await this._sdk.repos.createWebhook(webhookOptions)).data
          logger.info(
            `Reshuffle GitHub - webhook registered successfully (name: ${webhook.name}, url: ${webhook.url})`,
          )
        }
      }
    }
  }

  // Your events
  on(
    options: GitHubConnectorEventOptions,
    handler: (event: EventConfiguration & Record<string, any>, app: Reshuffle) => void,
    eventId: string,
  ): EventConfiguration {
    options.githubEvent = options.githubEvent || 'push'
    const path = this.configOptions?.webhookPath || DEFAULT_WEBHOOK_PATH

    if (!eventId) {
      eventId = `Github${path}/${options.githubEvent}/${this.id}`
    }
    const event = new EventConfiguration(eventId, this, options)
    this.eventConfigurations[event.id] = event

    this.app.when(event, handler as any)
    this.app.registerHTTPDelegate(path, this)

    return event
  }

  async handle(req: Request, res: Response): Promise<boolean> {
    const incomingGithubEvent = req.headers['x-github-event'] as GithubEvent
    const githubRepo = req.body.repository.name
    const githubOwner = req.body.repository.owner.login
    const logger = this.app.getLogger()

    if (this.configOptions.secret) {
      const signature = (req.headers['x-hub-signature-256'] ||
        req.headers['x-hub-signature']) as string

      const matchesSignature = verify(this.configOptions.secret, req.body, signature)
      if (!matchesSignature) {
        logger.error("Reshuffle GitHub - webhook secret doesn't match")
        return false
      }
    }

    const eventsUsingGithubEvent = Object.values(this.eventConfigurations).filter(
      (event: EventConfiguration) => {
        const { repo, owner, githubEvent } = event.options as GitHubConnectorEventOptions
        return repo === githubRepo && owner === githubOwner && githubEvent === incomingGithubEvent
      },
    )

    for (const event of eventsUsingGithubEvent) {
      await this.app.handleEvent(event.id, {
        ...event,
        ...req.body,
      })
    }

    res.send()

    return true
  }

  sdk(): Octokit {
    return this._sdk
  }
}

export { GitHubConnector }
