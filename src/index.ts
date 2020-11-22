import { Reshuffle, EventConfiguration, BaseHttpConnector } from 'reshuffle-base-connector'
import { Octokit, RestEndpointMethodTypes } from '@octokit/rest'
import { verify } from '@octokit/webhooks'
import type { Request, Response } from 'express'

const DEFAULT_WEBHOOK_PATH = '/reshuffle-github-connector/webhook'

type OctokitOptions = NonNullable<ConstructorParameters<typeof Octokit>[0]>

// From: https://developer.github.com/webhooks/event-payloads/#webhook-event-payloads
export type WebhookEvents =
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
}

export interface GitHubConnectorEventOptions {
  owner: string
  repo: string
  githubEvents?: WebhookEvents[]
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
  private _webhook?: RestEndpointMethodTypes['repos']['createWebhook']['response']['data']

  constructor(app: Reshuffle, options: GitHubConnectorConfigOptions, id?: string) {
    super(app, options, id)
    this._sdk = new Octokit({
      auth: options?.token ? `token ${options.token}` : undefined,
    })
  }

  async onStart(): Promise<void> {
    const logger = this.app.getLogger()
    const events = Object.values(this.eventConfigurations)

    if (events.length) {
      const baseUrl = validateBaseURL(this.configOptions?.runtimeBaseUrl)

      for (const event of events) {
        const { githubEvents } = event.options

        const webhookOptions: RestEndpointMethodTypes['repos']['createWebhook']['parameters'] = {
          events: githubEvents,
          repo: event.options.repo,
          config: {
            url: baseUrl + (this.configOptions?.webhookPath || DEFAULT_WEBHOOK_PATH),
            secret: this.configOptions.secret,
            insecure_ssl: '0',
            content_type: 'json',
          },
          owner: event.options.owner,
        }

        const webhooks = await this._sdk.repos.listWebhooks({
          owner: event.options.owner,
          repo: event.options.repo,
        })

        const existingWebhook = webhooks.data.find(({ events, config }) => {
          if (
            config.url === webhookOptions.config.url &&
            config.content_type === webhookOptions.config.content_type &&
            config.insecure_ssl === webhookOptions.config.insecure_ssl
          ) {
            const eventsNotRegistered = githubEvents.filter(
              (ev: WebhookEvents) => !events.includes(ev),
            )
            return eventsNotRegistered.length === 0
          }

          return false
        })

        this._webhook =
          existingWebhook || (await this._sdk.repos.createWebhook(webhookOptions)).data

        logger.info(
          `Reshuffle GitHub - webhook registered successfully (name: ${this._webhook.name}, url: ${this._webhook.url})`,
        )
      }
    }
  }

  // Your events
  on(
    options: GitHubConnectorEventOptions,
    handler: (event: EventConfiguration & Record<string, any>) => void,
    eventId: string,
  ): EventConfiguration {
    const path = this.configOptions?.webhookPath || DEFAULT_WEBHOOK_PATH

    if (!eventId) {
      eventId = `Github${path}/${options.githubEvents}/${this.id}`
    }
    const event = new EventConfiguration(eventId, this, options)
    this.eventConfigurations[event.id] = event

    this.app.when(event, handler as any)
    this.app.registerHTTPDelegate(path, this)

    return event
  }

  async handle(req: Request, res: Response): Promise<boolean> {
    const githubEvent = req.body.action
    if (!githubEvent) return true
    const githubRepo = req.body.repository.name
    const githubOwner = req.body.repository.owner.login
    const logger = this.app.getLogger()
    const eventsUsingGithubEvent = Object.values(this.eventConfigurations).filter(
      ({ options }) =>
        (options.repo === githubRepo &&
          options.owner === githubOwner &&
          options.githubEvents.includes('*')) ||
        options.githubEvents.includes(githubEvent),
    )

    if (this.configOptions.secret) {
      const signature = (req.headers['x-hub-signature-256'] ||
        req.headers['x-hub-signature']) as string

      const matchesSignature = verify(this.configOptions.secret, req.body, signature)
      if (!matchesSignature) {
        logger.error("Reshuffle GitHub - webhook secret doesn't match")
        return false
      }
    }

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
