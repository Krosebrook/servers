import { Octokit } from '@octokit/rest';
import { Logger } from '../utils/logger.js';

export class PushHandler {
  constructor(private octokit: Octokit | null) {}

  async handle(payload: any): Promise<void> {
    const { repository, ref, commits, pusher } = payload;
    const branch = ref.replace('refs/heads/', '');
    
    Logger.info('Processing push event', {
      repository: repository.full_name,
      branch,
      commitsCount: commits.length,
      pusher: pusher.name
    });

    // Handle main branch pushes
    if (branch === 'main' || branch === 'master') {
      await this.handleMainBranchPush(payload);
    }

    // Handle release branches
    if (branch.startsWith('release/')) {
      await this.handleReleaseBranchPush(payload);
    }

    // Check for specific file changes
    await this.checkForImportantFileChanges(payload);
  }

  private async handleMainBranchPush(payload: any): Promise<void> {
    const { repository, commits } = payload;
    
    Logger.info('Main branch push detected', {
      repository: repository.full_name,
      commitsCount: commits.length
    });

    // Check if any commits affect server packages
    const affectedServers = this.getAffectedServers(commits);
    
    if (affectedServers.length > 0) {
      Logger.info('Server packages affected by push', {
        servers: affectedServers,
        repository: repository.full_name
      });

      // Trigger automated tests for affected servers
      await this.triggerServerTests(repository, affectedServers);
    }
  }

  private async handleReleaseBranchPush(payload: any): Promise<void> {
    const { repository, ref } = payload;
    const branch = ref.replace('refs/heads/', '');
    const version = branch.replace('release/', '');

    Logger.info('Release branch push detected', {
      repository: repository.full_name,
      branch,
      version
    });

    // Could trigger release preparation workflows here
    if (this.octokit) {
      try {
        await this.octokit.actions.createWorkflowDispatch({
          owner: repository.owner.login,
          repo: repository.name,
          workflow_id: 'release.yml',
          ref: branch
        });
        
        Logger.info('Triggered release workflow', { branch, version });
      } catch (error) {
        Logger.error('Failed to trigger release workflow', { error, branch });
      }
    }
  }

  private async checkForImportantFileChanges(payload: any): Promise<void> {
    const { commits, repository } = payload;
    
    const importantFiles = [
      'package.json',
      'pyproject.toml',
      '.github/workflows/',
      'README.md'
    ];

    for (const commit of commits) {
      const changedFiles = [
        ...(commit.added || []),
        ...(commit.modified || []),
        ...(commit.removed || [])
      ];

      const importantChanges = changedFiles.filter(file => 
        importantFiles.some(important => file.includes(important))
      );

      if (importantChanges.length > 0) {
        Logger.info('Important files changed in commit', {
          commit: commit.id,
          files: importantChanges,
          repository: repository.full_name
        });
      }
    }
  }

  private getAffectedServers(commits: any[]): string[] {
    const servers = new Set<string>();
    
    for (const commit of commits) {
      const changedFiles = [
        ...(commit.added || []),
        ...(commit.modified || []),
        ...(commit.removed || [])
      ];

      for (const file of changedFiles) {
        const match = file.match(/^src\/([^\/]+)\//);
        if (match) {
          servers.add(match[1]);
        }
      }
    }

    return Array.from(servers);
  }

  private async triggerServerTests(repository: any, servers: string[]): Promise<void> {
    if (!this.octokit) return;

    Logger.info('Triggering tests for affected servers', {
      repository: repository.full_name,
      servers
    });

    // This could trigger specific test workflows
    // For now, we just log the intent
    for (const server of servers) {
      Logger.info(`Would trigger tests for server: ${server}`);
    }
  }
}