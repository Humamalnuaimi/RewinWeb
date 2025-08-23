#!/bin/bash

echo "🚀 Deploying Campaign Automation to Firebase..."
echo ""
echo "This will enable 24/7 campaign processing that runs even when the dashboard is closed."
echo ""

# Change to functions directory
cd functions

# Install dependencies
echo "📦 Installing dependencies..."
npm install firebase-admin@^11.11.0 firebase-functions@^4.4.1 --save

# Deploy only the processCampaigns function
echo ""
echo "☁️  Deploying to Firebase..."
npx firebase-tools deploy --only functions:processCampaigns --project rewin-f4ca1

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Your campaigns will now process automatically:"
echo "- Every hour the system checks all campaigns"
echo "- Each campaign runs based on its interval setting"
echo "- Works 24/7 without needing the dashboard open"
