---
name: notion
description: Read, search, create, and update Notion pages, blocks, databases, and data sources with the Notion CLI (`ntn`). Use when the user asks to inspect or change data in Notion through authenticated API requests.
compatibility: Requires the Notion CLI (`ntn`) and either `ntn login` authentication or `NOTION_API_TOKEN`.
allowed-tools:
  - Bash(ntn *)
  - Bash(jq *)
---

# Notion CLI

Use `ntn api` as the main interface for authenticated Notion API read and write requests. Use `ntn datasources query` for simple data source queries.

## Safety and setup

1. Confirm that the CLI exists with `command -v ntn`.
2. If it is missing, tell the user and refer to the official Notion CLI setup documentation. Do not guess an installation command.
3. Use existing CLI authentication from `ntn login`, or `NOTION_API_TOKEN` when it is already set. Never print, request, or store the token in files or command output.
4. For an unfamiliar endpoint, inspect it before use:

```bash
ntn api ls
ntn api v1/pages/<page-id> --help
ntn api v1/pages/<page-id> --spec -X PATCH
ntn api v1/pages/<page-id> --docs -X PATCH
```

5. Make read-only requests without extra confirmation.
6. Before a write, summarize the target and intended change. Ask for confirmation when the target is ambiguous, the change affects many objects, or the change archives, removes, or overwrites data.
7. Retrieve the current object before a destructive or broad update when practical.
8. After a write, inspect the response and report the changed object ID and URL when present.

## Request syntax

`ntn api` supplies the `Authorization` and `Notion-Version` headers. A request without body data uses `GET`. Body data changes the default method to `POST`; use `-X PATCH` or another explicit method when required.

```bash
ntn api v1/pages/<page-id>
ntn api v1/search query=roadmap
ntn api v1/search query==roadmap page_size==10
ntn api v1/pages -X POST parent[page_id]="<parent-page-id>"
ntn api v1/pages/<page-id> -X PATCH archived:=true
```

Use the correct input operator:

| Form | Purpose |
|---|---|
| `path=value` | JSON body string |
| `path:=json` | Typed JSON body value |
| `name==value` | Query parameter |
| `Header:Value` | Request header |

Use bracket notation for nested fields and property names with spaces. Use `:=` for booleans, numbers, arrays, objects, and `null`.

For a complex body, build JSON with `jq` and pipe it to `ntn api`. Use only one body source in each request: inline fields, `--data`, or stdin.

```bash
jq -n --arg page_id "$PARENT_PAGE_ID" --arg title "$TITLE" '{
  parent: {page_id: $page_id},
  properties: {
    title: {title: [{text: {content: $title}}]}
  }
}' | ntn api v1/pages
```

Quote paths that contain `?`, `&`, or shell-expanded values. Do not use `--unsafe-verbose`. For safe diagnostics, use:

```bash
ntn --verbose api v1/pages/<page-id>
```

## Read operations

### Search

```bash
ntn api v1/search query=roadmap page_size:=20
```

Use `start_cursor` from `next_cursor` while `has_more` is `true`. Filter by object type when useful:

```bash
ntn api v1/search \
  query=roadmap \
  filter:='{"property":"object","value":"page"}' \
  page_size:=20
```

### Read a page and its content

A page response contains properties, not all page content. Read both the page and its block children when the user asks for the full content:

```bash
ntn api v1/pages/<page-id>
ntn api v1/blocks/<page-id>/children page_size==100
```

Continue through block child pages with `start_cursor`. Retrieve children of nested blocks separately when `has_children` is `true`.

### Read a database and data source schema

```bash
ntn api v1/databases/<database-id>
ntn api v1/data_sources/<data-source-id>
```

The database response contains a `data_sources` array. Use its IDs for schema and row operations.

### Query a data source

Use the short command for a simple query:

```bash
ntn datasources query <data-source-id> --limit 50 --json
ntn datasources query <data-source-id> \
  --filter '{"property":"Status","select":{"equals":"Open"}}' \
  --json
```

Use the API command for sorts and other advanced options:

```bash
ntn api v1/data_sources/<data-source-id>/query \
  filter:='{"property":"Status","select":{"equals":"Open"}}' \
  sorts:='[{"property":"Priority","direction":"descending"}]' \
  page_size:=25
```

Paginate with `start_cursor`. Data source query results have a 10,000-page limit, so use filters for large sources.

## Write operations

### Create a page

Inspect the parent schema first when creating a page in a data source. Property values must match that schema.

```bash
ntn api v1/pages \
  parent[page_id]="<parent-page-id>" \
  properties[title][title][0][text][content]="New page"
```

For data source rows, use a JSON body so property types are clear:

```bash
jq -n --arg data_source_id "$DATA_SOURCE_ID" --arg title "$TITLE" '{
  parent: {type: "data_source_id", data_source_id: $data_source_id},
  properties: {
    Name: {title: [{text: {content: $title}}]}
  }
}' | ntn api v1/pages
```

### Update page properties

```bash
ntn api v1/pages/<page-id> -X PATCH \
  properties[Status][select][name]="Done"
```

Use the exact property name and type from the parent data source schema.

### Append page content

```bash
ntn api v1/blocks/<page-id>/children -X PATCH \
  children[0][type]=paragraph \
  children[0][paragraph][rich_text][0][text][content]="Added with the Notion CLI"
```

### Archive an object

Treat archive actions as destructive and confirm first unless the user gave a direct, specific instruction.

```bash
ntn api v1/pages/<page-id> -X PATCH archived:=true
ntn api v1/blocks/<block-id> -X DELETE
```

### Create or update a data source

```bash
ntn api v1/data_sources \
  parent[type]=database_id \
  parent[database_id]="<database-id>" \
  title[0][type]=text \
  title[0][text][content]="Bugs" \
  properties:='{"Name":{"title":{}},"Status":{"select":{"options":[{"name":"Open","color":"red"}]}}}'
```

```bash
ntn api v1/data_sources/<data-source-id> -X PATCH \
  title:='[{"type":"text","text":{"content":"Bugs (Q2)"}}]' \
  properties:='{"Assignee":{"people":{}}}'
```

Rename a property with `{"Old name":{"name":"New name"}}`. Passing `null` removes a property, so confirm before doing this.

## Response handling

Prefer JSON output for automation. Use `jq` to select only needed fields instead of placing large Notion responses in the conversation.

```bash
ntn api v1/pages/<page-id> | jq '{id, url, archived, properties}'
ntn api v1/data_sources/<data-source-id>/query page_size:=25 |
  jq '{has_more, next_cursor, results: [.results[] | {id, url, properties}]}'
```

When a request fails:

1. Inspect the endpoint with `--help`, `--spec`, or `--docs`.
2. Use `--verbose` and check the method, URL, response status, and `x-request-id`.
3. Check that strings use `=`, typed JSON uses `:=`, and query parameters use `==`.
4. Check that only one request body source is in use.
5. Check that the integration can access the target page or database.
6. Report the status and `x-request-id`, but do not expose credentials.

## Official references

- [API requests](https://developers.notion.com/cli/guides/api-requests)
- [Data sources](https://developers.notion.com/cli/guides/data-sources)
- Use `ntn api <path> --docs -X <method>` for the current endpoint reference.
