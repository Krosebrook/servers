#!/usr/bin/env node

import express from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { Webhooks } from '@octokit/webhooks';
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';
import { WebhookHandlers } from './handlers/index.js';
import { Logger } from './utils/logger.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
const githubToken = process.env.GITHUB_TOKEN;

if (!webhookSecret) {
  throw new Error('GITHUB_WEBHOOK_SECRET environment variable is required');
}

// Initialize GitHub clients
const webhooks = new Webhooks({
  secret: webhookSecret,
});

const octokit = githubToken ? new Octokit({ auth: githubToken }) : null;

// Initialize webhook handlers
const handlers = new WebhookHandlers(octokit);

// Middleware
app.use(express.raw({ type: 'application/json' }));

// Webhook signature verification middleware
const verifySignature = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const payload = req.body;

  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }

  const expectedSignature = `sha256=${createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex')}`;

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main webhook endpoint
app.post('/webhook', verifySignature, async (req, res) => {
  const eventName = req.headers['x-github-event'] as string;
  const deliveryId = req.headers['x-github-delivery'] as string;
  const payload = JSON.parse(req.body.toString());

  Logger.info(`Received ${eventName} event`, { deliveryId, repository: payload.repository?.full_name });

  try {
    await webhooks.verifyAndReceive({
      id: deliveryId,
      name: eventName as any,
      signature: req.headers['x-hub-signature-256'] as string,
      payload: req.body.toString(),
    });

    // Handle the event with our custom handlers
    await handlers.handleEvent(eventName, payload, deliveryId);

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    Logger.error('Error processing webhook', { error, eventName, deliveryId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register webhook event handlers
webhooks.on('push', handlers.onPush.bind(handlers));
webhooks.on('pull_request', handlers.onPullRequest.bind(handlers));
webhooks.on('release', handlers.onRelease.bind(handlers));
webhooks.on('workflow_run', handlers.onWorkflowRun.bind(handlers));
webhooks.on('issues', handlers.onIssues.bind(handlers));
webhooks.on('repository', handlers.onRepository.bind(handlers));

// Error handling
webhooks.onError((error) => {
  Logger.error('Webhook error', { error });
});

// Start server
app.listen(port, () => {
  Logger.info(`Webhook server listening on port ${port}`);
  Logger.info('Registered event handlers:', {
    handlers: ['push', 'pull_request', 'release', 'workflow_run', 'issues', 'repository']
  });
});

export { app };