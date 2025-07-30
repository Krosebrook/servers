#!/bin/bash

# MCP Webhook Server Setup Script
# This script helps you set up the webhook server quickly

set -e

echo "🚀 Setting up MCP Webhook Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo "📝 Please edit .env file with your configuration:"
    echo "   - GITHUB_WEBHOOK_SECRET: Your GitHub webhook secret"
    echo "   - GITHUB_TOKEN: Your GitHub personal access token"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Build the project
echo "🔨 Building project..."
npm run build

# Check if webhook secret is set
if grep -q "your_webhook_secret_here" .env 2>/dev/null; then
    echo "⚠️  Warning: Please update GITHUB_WEBHOOK_SECRET in .env file"
fi

if grep -q "your_github_token_here" .env 2>/dev/null; then
    echo "⚠️  Warning: Please update GITHUB_TOKEN in .env file"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your GitHub webhook secret and token"
echo "2. Set up your GitHub webhook to point to: https://your-domain.com/webhook"
echo "3. Start the server with: npm start"
echo "4. Or run in development mode: npm run dev"
echo ""
echo "📚 For more information, see README.md"