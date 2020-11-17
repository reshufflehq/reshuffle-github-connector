import { Reshuffle, BaseConnector, EventConfiguration } from 'reshuffle-base-connector'

export interface _CONNECTOR_NAME_ConnectorConfigOptions {
  var1: string
  // ...
}

export interface _CONNECTOR_NAME_ConnectorEventOptions {
  option1?: string
  // ...
}

export default class _CONNECTOR_NAME_Connector extends BaseConnector<
  _CONNECTOR_NAME_ConnectorConfigOptions,
  _CONNECTOR_NAME_ConnectorEventOptions
> {
  // Your class variables
  var1: string

  constructor(app: Reshuffle, options?: _CONNECTOR_NAME_ConnectorConfigOptions, id?: string) {
    super(app, options, id)
    this.var1 = options?.var1 || 'initial value'
    // ...
  }

  onStart(): void {
    // If you need to do something specific on start, otherwise remove this function
  }

  onStop(): void {
    // If you need to do something specific on stop, otherwise remove this function
  }

  // Your events
  on(
    options: _CONNECTOR_NAME_ConnectorEventOptions,
    handler: any,
    eventId: string,
  ): EventConfiguration {
    if (!eventId) {
      eventId = `_CONNECTOR_NAME_/${options.option1}/${this.id}`
    }
    const event = new EventConfiguration(eventId, this, options)
    this.eventConfigurations[event.id] = event

    this.app.when(event, handler)

    return event
  }

  // Your actions
  action1(bar: string): void {
    // Your implementation here
  }

  action2(foo: string): void {
    // Your implementation here
  }
}

export { _CONNECTOR_NAME_Connector }
