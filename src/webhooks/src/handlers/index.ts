import { Octokit } from '@octokit/rest';
import { Logger } from '../utils/logger.js';
import { PushHandler } from './push.js';
import { PullRequestHandler } from './pullRequest.js';
import { ReleaseHandler } from './release.js';
import { WorkflowHandler } from './workflow.js';
import { IssuesHandler } from './issues.js';
import { RepositoryHandler } from './repository.js';

export class WebhookHandlers {
  private pushHandler: PushHandler;
  private pullRequestHandler: PullRequestHandler;
  private releaseHandler: ReleaseHandler;
  private workflowHandler: WorkflowHandler;
  private issuesHandler: IssuesHandler;
  private repositoryHandler: RepositoryHandler;

  constructor(private octokit: Octokit | null) {
    this.pushHandler = new PushHandler(octokit);
    this.pullRequestHandler = new PullRequestHandler(octokit);
    this.releaseHandler = new ReleaseHandler(octokit);
    this.workflowHandler = new WorkflowHandler(octokit);
    this.issuesHandler = new IssuesHandler(octokit);
    this.repositoryHandler = new RepositoryHandler(octokit);
  }

  async handleEvent(eventName: string, payload: any, deliveryId: string): Promise<void> {
    Logger.info(`Processing ${eventName} event`, { 
      deliveryId, 
      repository: payload.repository?.full_name,
      action: payload.action 
    });

    try {
      switch (eventName) {
        case 'push':
          await this.onPush(payload);
          break;
        case 'pull_request':
          await this.onPullRequest(payload);
          break;
        case 'release':
          await this.onRelease(payload);
          break;
        case 'workflow_run':
          await this.onWorkflowRun(payload);
          break;
        case 'issues':
          await this.onIssues(payload);
          break;
        case 'repository':
          await this.onRepository(payload);
          break;
        default:
          Logger.warn(`Unhandled event type: ${eventName}`, { deliveryId });
      }
    } catch (error) {
      Logger.error(`Error handling ${eventName} event`, { error, deliveryId });
      throw error;
    }
  }

  async onPush(payload: any): Promise<void> {
    return this.pushHandler.handle(payload);
  }

  async onPullRequest(payload: any): Promise<void> {
    return this.pullRequestHandler.handle(payload);
  }

  async onRelease(payload: any): Promise<void> {
    return this.releaseHandler.handle(payload);
  }

  async onWorkflowRun(payload: any): Promise<void> {
    return this.workflowHandler.handle(payload);
  }

  async onIssues(payload: any): Promise<void> {
    return this.issuesHandler.handle(payload);
  }

  async onRepository(payload: any): Promise<void> {
    return this.repositoryHandler.handle(payload);
  }
}