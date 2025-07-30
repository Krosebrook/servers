# MCP Webhook Server

A comprehensive webhook server for handling GitHub events in the Model Context Protocol servers repository.

## Features

- 🔐 **Secure webhook handling** with signature verification
- 🎯 **Event-driven architecture** with specialized handlers
- 📊 **Comprehensive logging** with structured JSON output
- 🏷️ **Intelligent labeling** for issues and pull requests
- 👋 **Welcome automation** for first-time contributors
- 🔄 **CI/CD integration** with workflow monitoring
- 📦 **Release management** with package verification
- 🐳 **Docker support** for easy deployment

## Supported Events

### Pull Requests
- Auto-labeling based on changed files
- Welcome comments for new contributors
- Affected server detection and notification
- Review assignment automation

### Issues
- Smart categorization (bug, feature, documentation, question)
- Server-specific labeling
- Priority detection
- Welcome messages for first-time issue creators

### Releases
- Release validation and metrics
- Package registry verification
- Notification triggers
- Release notes validation

### Workflows
- Failure analysis and reporting
- Success handling and notifications
- Metrics collection
- Critical workflow alerting

### Push Events
- Main branch monitoring
- Release branch handling
- Important file change detection
- Automated testing triggers

### Repository Events
- New repository setup
- Archival/unarchival handling
- Visibility change management

## Quick Start

### Prerequisites

- Node.js 18+ 
- GitHub Personal Access Token
- Webhook secret from GitHub

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd src/webhooks
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Build and start:
```bash
npm run build
npm start
```

### Development

```bash
# Watch mode for development
npm run dev

# Run tests
npm test

# Type checking
npm run build
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_WEBHOOK_SECRET` | Secret for webhook signature verification | Yes |
| `GITHUB_TOKEN` | GitHub Personal Access Token | Yes |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |

### Optional Services

| Variable | Description |
|----------|-------------|
| `SLACK_WEBHOOK_URL` | Slack notifications |
| `DISCORD_WEBHOOK_URL` | Discord notifications |
| `DATABASE_URL` | PostgreSQL for metrics storage |
| `REDIS_URL` | Redis for caching/queuing |

## Deployment

### Docker

```bash
# Build image
docker build -t mcp-webhooks .

# Run container
docker run -p 3000:3000 --env-file .env mcp-webhooks
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f webhook-server
```

### GitHub Container Registry

The webhook server is automatically built and published to GitHub Container Registry on every push to main:

```bash
docker pull ghcr.io/modelcontextprotocol/servers/webhook-server:latest
```

## GitHub Setup

### 1. Create Webhook

1. Go to your repository settings
2. Navigate to Webhooks
3. Click "Add webhook"
4. Set Payload URL to: `https://your-domain.com/webhook`
5. Set Content type to: `application/json`
6. Set Secret to your `GITHUB_WEBHOOK_SECRET`
7. Select events:
   - Issues
   - Pull requests
   - Pushes
   - Releases
   - Workflow runs
   - Repository

### 2. Generate Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token with these scopes:
   - `repo` (Full control of private repositories)
   - `workflow` (Update GitHub Action workflows)
   - `write:packages` (Upload packages to GitHub Package Registry)

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and timestamp.

### Webhook Endpoint
```
POST /webhook
```
Receives GitHub webhook events. Requires proper signature verification.

## Event Handlers

### PushHandler
- Monitors main branch pushes
- Handles release branch creation
- Detects important file changes
- Triggers automated tests for affected servers

### PullRequestHandler
- Auto-labels based on file changes
- Welcomes first-time contributors
- Identifies affected server packages
- Manages PR lifecycle

### ReleaseHandler
- Validates release notes
- Verifies package publication
- Generates release metrics
- Triggers notifications

### WorkflowHandler
- Analyzes workflow failures
- Tracks performance metrics
- Sends critical failure alerts
- Manages workflow lifecycle

### IssuesHandler
- Categorizes issues automatically
- Adds appropriate labels
- Welcomes new contributors
- Detects priority levels

### RepositoryHandler
- Manages repository lifecycle
- Handles visibility changes
- Automates repository setup
- Manages archival processes

## Monitoring

### Health Checks

The server includes health check endpoints for monitoring:

```bash
curl http://localhost:3000/health
```

### Logging

All events are logged with structured JSON format:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "message": "Processing pull_request event",
  "meta": {
    "repository": "modelcontextprotocol/servers",
    "prNumber": 123,
    "action": "opened"
  }
}
```

### Metrics

The webhook server tracks various metrics:
- Event processing times
- Success/failure rates
- Repository activity
- Contributor statistics

## Security

### Webhook Verification

All incoming webhooks are verified using HMAC-SHA256 signatures to ensure they come from GitHub.

### Environment Security

- Secrets are loaded from environment variables
- No sensitive data in logs
- Secure Docker image with non-root user
- HTTPS required for production

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check GitHub webhook configuration
   - Verify webhook URL is accessible
   - Check webhook secret matches

2. **Authentication errors**
   - Verify GitHub token has correct permissions
   - Check token hasn't expired
   - Ensure token is properly set in environment

3. **Build failures**
   - Run `npm install` to update dependencies
   - Check TypeScript compilation with `npm run build`
   - Verify Node.js version (18+ required)

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## Support

For issues and questions:
- Create an issue in the repository
- Check existing documentation
- Review the troubleshooting guide

---

Built with ❤️ for the Model Context Protocol community.