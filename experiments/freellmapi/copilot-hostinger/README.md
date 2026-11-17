# Copilot SDK Hostinger compatibility probe

Status: **prepared, not deployed, not authenticated, not functionally verified**.

This is an isolated private-user proof of concept. It is not connected to FreeLLMAPI's chat gateway and does not modify ENCARMEN production.

## Requirements
- Hostinger Business Node.js web application with suitable Node.js version and Linux native runtime support.
- `COPILOT_GITHUB_TOKEN`: GitHub-authorized Copilot credential, **not** the existing project-memory `GITHUB_TOKEN`.
- `COPILOT_PROBE_SECRET`: independent strong bearer secret for the private test endpoint.
- `PORT`: supplied by Hostinger.

## Local/static checks
`npm install`, `npm run check`.

## Controlled deployment test
Deploy this folder as a separate Node.js website, configure secrets in Hostinger (never in Git), request `GET /health`, then make **one** authenticated `POST /probe`. The probe starts an experimental in-process runtime, creates one Copilot session, performs one model turn, and stops the client.

Do not expose the endpoint publicly without access controls. This probe has no request throttling and is **not production ready**. It must not be used by third parties or attached to the shared gateway. No deployment should proceed before verifying Hostinger CPU/RAM, native runtime architecture and GitHub credits/budget.

## Findings
Hostinger Business supports a Node.js website process but disallows permanent background workers, custom ports and inbound WebSockets; requests time out after 120 seconds. GitHub in-process runtime requires a compatible native bundle and remains experimental.

## References
- https://docs.github.com/en/copilot/how-tos/copilot-sdk/setup/in-process-runtime
- https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/
