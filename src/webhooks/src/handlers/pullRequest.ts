import { Octokit } from '@octokit/rest';
import { Logger } from '../utils/logger.js';

export class PullRequestHandler {
  constructor(private octokit: Octokit | null) {}

  async handle(payload: any): Promise<void> {
    const { action, pull_request, repository } = payload;
    
    Logger.info('Processing pull request event', {
      action,
      repository: repository.full_name,
      prNumber: pull_request.number,
      title: pull_request.title,
      author: pull_request.user.login
    });

    switch (action) {
      case 'opened':
        await this.handlePROpened(payload);
        break;
      case 'synchronize':
        await this.handlePRSynchronized(payload);
        break;
      case 'closed':
        await this.handlePRClosed(payload);
        break;
      case 'ready_for_review':
        await this.handlePRReadyForReview(payload);
        break;
      default:
        Logger.debug(`Unhandled PR action: ${action}`);
    }
  }

  private async handlePROpened(payload: any): Promise<void> {
    const { pull_request, repository } = payload;
    
    Logger.info('New pull request opened', {
      repository: repository.full_name,
      prNumber: pull_request.number,
      author: pull_request.user.login
    });

    // Add labels based on changed files
    await this.addLabelsBasedOnChanges(repository, pull_request);
    
    // Check if PR affects server packages
    await this.checkAffectedServers(repository, pull_request);
    
    // Add welcome comment for first-time contributors
    await this.addWelcomeComment(repository, pull_request);
  }

  private async handlePRSynchronized(payload: any): Promise<void> {
    const { pull_request, repository } = payload;
    
    Logger.info('Pull request synchronized (new commits)', {
      repository: repository.full_name,
      prNumber: pull_request.number
    });

    // Re-check affected servers when new commits are added
    await this.checkAffectedServers(repository, pull_request);
  }

  private async handlePRClosed(payload: any): Promise<void> {
    const { pull_request, repository } = payload;
    const merged = pull_request.merged;
    
    Logger.info(`Pull request ${merged ? 'merged' : 'closed'}`, {
      repository: repository.full_name,
      prNumber: pull_request.number,
      merged
    });

    if (merged) {
      await this.handlePRMerged(payload);
    }
  }

  private async handlePRReadyForReview(payload: any): Promise<void> {
    const { pull_request, repository } = payload;
    
    Logger.info('Pull request ready for review', {
      repository: repository.full_name,
      prNumber: pull_request.number
    });

    // Could trigger review assignment logic here
    await this.requestReviewers(repository, pull_request);
  }

  private async handlePRMerged(payload: any): Promise<void> {
    const { pull_request, repository } = payload;
    
    Logger.info('Pull request merged', {
      repository: repository.full_name,
      prNumber: pull_request.number,
      baseBranch: pull_request.base.ref
    });

    // If merged to main, could trigger release preparation
    if (pull_request.base.ref === 'main') {
      Logger.info('PR merged to main branch, considering release impact');
    }
  }

  private async addLabelsBasedOnChanges(repository: any, pullRequest: any): Promise<void> {
    if (!this.octokit) return;

    try {
      // Get the files changed in this PR
      const { data: files } = await this.octokit.pulls.listFiles({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: pullRequest.number
      });

      const labels = [];
      const changedPaths = files.map(file => file.filename);

      // Check for documentation changes
      if (changedPaths.some(path => path.endsWith('.md'))) {
        labels.push('documentation');
      }

      // Check for workflow changes
      if (changedPaths.some(path => path.includes('.github/workflows'))) {
        labels.push('ci/cd');
      }

      // Check for server-specific changes
      const affectedServers = this.getAffectedServersFromPaths(changedPaths);
      for (const server of affectedServers) {
        labels.push(`server:${server}`);
      }

      // Check for breaking changes based on file types
      if (changedPaths.some(path => path.includes('package.json') || path.includes('pyproject.toml'))) {
        labels.push('dependencies');
      }

      if (labels.length > 0) {
        await this.octokit.issues.addLabels({
          owner: repository.owner.login,
          repo: repository.name,
          issue_number: pullRequest.number,
          labels
        });

        Logger.info('Added labels to PR', {
          prNumber: pullRequest.number,
          labels
        });
      }
    } catch (error) {
      Logger.error('Failed to add labels to PR', { error, prNumber: pullRequest.number });
    }
  }

  private async checkAffectedServers(repository: any, pullRequest: any): Promise<void> {
    if (!this.octokit) return;

    try {
      const { data: files } = await this.octokit.pulls.listFiles({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: pullRequest.number
      });

      const changedPaths = files.map(file => file.filename);
      const affectedServers = this.getAffectedServersFromPaths(changedPaths);

      if (affectedServers.length > 0) {
        Logger.info('PR affects server packages', {
          prNumber: pullRequest.number,
          servers: affectedServers
        });

        // Could add a comment listing affected servers
        const comment = `🔍 **Affected Servers**: ${affectedServers.map(s => `\`${s}\``).join(', ')}

This PR modifies the following server packages. Please ensure appropriate testing is performed.`;

        await this.octokit.issues.createComment({
          owner: repository.owner.login,
          repo: repository.name,
          issue_number: pullRequest.number,
          body: comment
        });
      }
    } catch (error) {
      Logger.error('Failed to check affected servers', { error, prNumber: pullRequest.number });
    }
  }

  private async addWelcomeComment(repository: any, pullRequest: any): Promise<void> {
    if (!this.octokit) return;

    try {
      // Check if this is the user's first contribution
      const { data: contributions } = await this.octokit.pulls.list({
        owner: repository.owner.login,
        repo: repository.name,
        creator: pullRequest.user.login,
        state: 'all'
      });

      if (contributions.length === 1) { // This is their first PR
        const welcomeComment = `👋 Welcome to the Model Context Protocol servers repository, @${pullRequest.user.login}!

Thank you for your first contribution! Here are a few things to keep in mind:

- 📋 Please ensure your PR follows our [contribution guidelines](CONTRIBUTING.md)
- 🧪 Run tests locally before pushing: \`npm test\`
- 📝 Update documentation if you're adding new features
- 🏷️ I've automatically added some labels based on the files you've changed

A maintainer will review your PR soon. Thanks for contributing to MCP! 🚀`;

        await this.octokit.issues.createComment({
          owner: repository.owner.login,
          repo: repository.name,
          issue_number: pullRequest.number,
          body: welcomeComment
        });

        Logger.info('Added welcome comment for first-time contributor', {
          prNumber: pullRequest.number,
          author: pullRequest.user.login
        });
      }
    } catch (error) {
      Logger.error('Failed to add welcome comment', { error, prNumber: pullRequest.number });
    }
  }

  private async requestReviewers(repository: any, pullRequest: any): Promise<void> {
    if (!this.octokit) return;

    // This is a placeholder for reviewer assignment logic
    // In a real implementation, you might:
    // 1. Check CODEOWNERS file
    // 2. Assign based on affected files
    // 3. Use round-robin assignment
    // 4. Check reviewer availability

    Logger.info('Would assign reviewers for PR', {
      prNumber: pullRequest.number,
      repository: repository.full_name
    });
  }

  private getAffectedServersFromPaths(paths: string[]): string[] {
    const servers = new Set<string>();
    
    for (const path of paths) {
      const match = path.match(/^src\/([^\/]+)\//);
      if (match) {
        servers.add(match[1]);
      }
    }

    return Array.from(servers);
  }
}