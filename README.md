## BEGIN - TO DELETE TILL END

THIS IS A TEMPLATE REPO FOR NEW RESHUFFLE CONNECTORS
1. Create a new connector repo from this template using this link https://github.com/reshufflehq/reshuffle-template-connector/generate
2. Clone the repo locally
3. Rename all occurrences of _CONNECTOR_NAME_
4. `npm install`
5. `npm run build:watch`
6. Implement your events/actions in `src/index.ts`
7. `npm run lint`
8. Push your code
9. Go to https://app.circleci.com/projects/project-dashboard/github/reshufflehq/
    a. You should see your new connector repo
    b. click on `Set Up Project` for the repo
    c. click on `Use Existing Config`
    d. click on `Start Building`

10. If circle CI checks are all green, you are all set!

// Keep documentation template below

## END

# reshuffle-_CONNECTOR_NAME_-connector

### Reshuffle _CONNECTOR_NAME_ Connector

This connector provides <description>.

#### Configuration Options:
```typescript
interface _CONNECTOR_NAME_ConnectorConfigOptions {
  foo: string // foo description
  bar?: number // bar description
}
```

#### Connector events

##### event1 description
The connector fires this event when ...

##### event2 description
The connector fires this event when ...

#### Connector actions

##### action1
The connector provides action1 which ...

##### action2
The connector provides action2 which ...