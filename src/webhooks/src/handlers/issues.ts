import { Octokit } from '@octokit/rest';
import { Logger } from '../utils/logger.js';

export class IssuesHandler {
  constructor(private octokit: Octokit | null) {}

  async handle(payload: any): Promise<void> {
    const { action, issue, repository } = payload;
    
    Logger.info('Processing issues event', {
      action,
      repository: repository.full_name,
      issueNumber: issue.number,
      title: issue.title,
      author: issue.user.login
    });

    switch (action) {
      case 'opened':
        await this.handleIssueOpened(payload);
        break;
      case 'closed':
        await this.handleIssueClosed(payload);
        break;
      case 'labeled':
        await this.handleIssueLabeled(payload);
        break;
      case 'assigned':
        await this.handleIssueAssigned(payload);
        break;
      default:
        Logger.debug(`Unhandled issue action: ${action}`);
    }
  }

  private async handleIssueOpened(payload: any): Promise<void> {
    const { issue, repository } = payload;
    
    Logger.info('New issue opened', {
      repository: repository.full_name,
      issueNumber: issue.number,
      author: issue.user.login
    });

    // Auto-label based on content
    await this.autoLabelIssue(repository, issue);
    
    // Add welcome comment for first-time contributors
    await this.addWelcomeComment(repository, issue);
    
    // Check for bug reports and feature requests
    await this.categorizeIssue(repository, issue);
  }

  private async handleIssueClosed(payload: any): Promise<void> {
    const { issue, repository } = payload;
    
    Logger.info('Issue closed', {
      repository: repository.full_name,
      issueNumber: issue.number,
      state_reason: issue.state_reason
    });
  }

  private async handleIssueLabeled(payload: any): Promise<void> {
    const { issue, label, repository } = payload;
    
    Logger.info('Issue labeled', {
      repository: repository.full_name,
      issueNumber: issue.number,
      label: label.name
    });
  }

  private async handleIssueAssigned(payload: any): Promise<void> {
    const { issue, assignee, repository } = payload;
    
    Logger.info('Issue assigned', {
      repository: repository.full_name,
      issueNumber: issue.number,
      assignee: assignee.login
    });
  }

  private async autoLabelIssue(repository: any, issue: any): Promise<void> {
    if (!this.octokit) return;

    const labels = [];
    const title = issue.title.toLowerCase();
    const body = (issue.body || '').toLowerCase();

    // Bug detection
    if (title.includes('bug') || title.includes('error') || title.includes('issue') ||
        body.includes('bug') || body.includes('error') || body.includes('broken')) {
      labels.push('bug');
    }

    // Feature request detection
    if (title.includes('feature') || title.includes('enhancement') || title.includes('add') ||
        body.includes('feature request') || body.includes('enhancement')) {
      labels.push('enhancement');
    }

    // Documentation
    if (title.includes('doc') || title.includes('readme') ||
        body.includes('documentation') || body.includes('docs')) {
      labels.push('documentation');
    }

    // Question
    if (title.includes('question') || title.includes('how to') ||
        body.includes('question') || title.includes('?')) {
      labels.push('question');
    }

    if (labels.length > 0) {
      try {
        await this.octokit.issues.addLabels({
          owner: repository.owner.login,
          repo: repository.name,
          issue_number: issue.number,
          labels
        });

        Logger.info('Auto-labeled issue', {
          issueNumber: issue.number,
          labels
        });
      } catch (error) {
        Logger.error('Failed to auto-label issue', { error });
      }
    }
  }

  private async addWelcomeComment(repository: any, issue: any): Promise<void> {
    if (!this.octokit) return;

    try {
      // Check if this is the user's first issue
      const { data: userIssues } = await this.octokit.issues.listForRepo({
        owner: repository.owner.login,
        repo: repository.name,
        creator: issue.user.login,
        state: 'all'
      });

      if (userIssues.length === 1) { // This is their first issue
        const welcomeComment = `👋 Welcome to the Model Context Protocol servers repository, @${issue.user.login}!

Thank you for opening your first issue! Here are a few things to help us help you:

- 🐛 **Bug reports**: Please include steps to reproduce, expected behavior, and actual behavior
- 💡 **Feature requests**: Please describe the use case and why this would be valuable
- ❓ **Questions**: Check our [documentation](README.md) first, and feel free to ask for clarification

A maintainer will review your issue soon. Thanks for contributing to MCP! 🚀`;

        await this.octokit.issues.createComment({
          owner: repository.owner.login,
          repo: repository.name,
          issue_number: issue.number,
          body: welcomeComment
        });

        Logger.info('Added welcome comment for first-time issue creator', {
          issueNumber: issue.number,
          author: issue.user.login
        });
      }
    } catch (error) {
      Logger.error('Failed to add welcome comment to issue', { error });
    }
  }

  private async categorizeIssue(repository: any, issue: any): Promise<void> {
    const title = issue.title.toLowerCase();
    const body = (issue.body || '').toLowerCase();

    // Check for server-specific issues
    const serverMatches = title.match(/server[:\s]+(\w+)/) || body.match(/server[:\s]+(\w+)/);
    if (serverMatches) {
      const serverName = serverMatches[1];
      Logger.info('Issue relates to specific server', {
        issueNumber: issue.number,
        server: serverName
      });

      if (this.octokit) {
        try {
          await this.octokit.issues.addLabels({
            owner: repository.owner.login,
            repo: repository.name,
            issue_number: issue.number,
            labels: [`server:${serverName}`]
          });
        } catch (error) {
          Logger.error('Failed to add server label', { error });
        }
      }
    }

    // Check for priority indicators
    if (title.includes('urgent') || title.includes('critical') || 
        body.includes('urgent') || body.includes('critical')) {
      Logger.info('High priority issue detected', {
        issueNumber: issue.number
      });

      if (this.octokit) {
        try {
          await this.octokit.issues.addLabels({
            owner: repository.owner.login,
            repo: repository.name,
            issue_number: issue.number,
            labels: ['priority:high']
          });
        } catch (error) {
          Logger.error('Failed to add priority label', { error });
        }
      }
    }
  }
}