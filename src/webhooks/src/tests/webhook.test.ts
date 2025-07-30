import request from 'supertest';
import { createHmac } from 'crypto';
import { app } from '../index.js';

// Mock environment variables for testing
process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

describe('Webhook Server', () => {
  const secret = 'test-secret';
  
  const createSignature = (payload: string): string => {
    return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
  };

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /webhook', () => {
    const mockPayload = {
      action: 'opened',
      repository: {
        full_name: 'test/repo',
        owner: { login: 'test' },
        name: 'repo'
      },
      pull_request: {
        number: 1,
        title: 'Test PR',
        user: { login: 'testuser' }
      }
    };

    it('should reject requests without signature', async () => {
      await request(app)
        .post('/webhook')
        .send(mockPayload)
        .expect(401);
    });

    it('should reject requests with invalid signature', async () => {
      await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', 'sha256=invalid')
        .set('x-github-event', 'pull_request')
        .set('x-github-delivery', 'test-delivery-id')
        .send(mockPayload)
        .expect(401);
    });

    it('should accept requests with valid signature', async () => {
      const payload = JSON.stringify(mockPayload);
      const signature = createSignature(payload);

      await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', signature)
        .set('x-github-event', 'pull_request')
        .set('x-github-delivery', 'test-delivery-id')
        .set('content-type', 'application/json')
        .send(payload)
        .expect(200);
    });

    it('should handle push events', async () => {
      const pushPayload = {
        ref: 'refs/heads/main',
        repository: {
          full_name: 'test/repo',
          owner: { login: 'test' },
          name: 'repo'
        },
        commits: [
          {
            id: 'abc123',
            added: ['src/test.ts'],
            modified: [],
            removed: []
          }
        ],
        pusher: { name: 'testuser' }
      };

      const payload = JSON.stringify(pushPayload);
      const signature = createSignature(payload);

      await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', signature)
        .set('x-github-event', 'push')
        .set('x-github-delivery', 'test-delivery-id')
        .set('content-type', 'application/json')
        .send(payload)
        .expect(200);
    });

    it('should handle release events', async () => {
      const releasePayload = {
        action: 'published',
        repository: {
          full_name: 'test/repo',
          owner: { login: 'test' },
          name: 'repo'
        },
        release: {
          tag_name: 'v1.0.0',
          name: 'Release 1.0.0',
          prerelease: false,
          body: '## What\'s Changed\n- New features'
        }
      };

      const payload = JSON.stringify(releasePayload);
      const signature = createSignature(payload);

      await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', signature)
        .set('x-github-event', 'release')
        .set('x-github-delivery', 'test-delivery-id')
        .set('content-type', 'application/json')
        .send(payload)
        .expect(200);
    });
  });
});