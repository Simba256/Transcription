#!/bin/bash

echo "🧪 Testing Firebase Auth App Setup"
echo "=================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Docker container
echo -e "\n${YELLOW}Test 1: Checking Docker container...${NC}"
if docker ps | grep -q firebase-auth-app; then
    echo -e "${GREEN}✅ Container is running${NC}"
else
    echo -e "${RED}❌ Container is not running${NC}"
    exit 1
fi

# Test 2: Local API access
echo -e "\n${YELLOW}Test 2: Testing local API...${NC}"
if curl -s http://localhost:3002/api/test-config | grep -q "speechmaticsConnection"; then
    echo -e "${GREEN}✅ Local API is working${NC}"
else
    echo -e "${RED}❌ Local API failed${NC}"
    exit 1
fi

# Test 3: Webhook endpoint
echo -e "\n${YELLOW}Test 3: Testing webhook endpoint...${NC}"
WEBHOOK_RESPONSE=$(curl -s "http://localhost:3002/api/speechmatics/callback?token=speechmatics_webhook_secret_2024")
if echo "$WEBHOOK_RESPONSE" | grep -q "active"; then
    echo -e "${GREEN}✅ Webhook endpoint is active${NC}"
    echo "   Response: $WEBHOOK_RESPONSE"
else
    echo -e "${RED}❌ Webhook endpoint failed${NC}"
    exit 1
fi

# Test 4: Check ngrok
echo -e "\n${YELLOW}Test 4: Checking ngrok...${NC}"
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -o 'https://[a-zA-Z0-9-]*\.ngrok-free\.app' | head -1)
if [ -n "$NGROK_URL" ]; then
    echo -e "${GREEN}✅ ngrok is running${NC}"
    echo "   URL: $NGROK_URL"

    # Test ngrok webhook
    echo -e "\n${YELLOW}Test 5: Testing ngrok webhook...${NC}"
    NGROK_WEBHOOK="${NGROK_URL}/api/speechmatics/callback?token=speechmatics_webhook_secret_2024"
    NGROK_RESPONSE=$(curl -s "$NGROK_WEBHOOK" -H "ngrok-skip-browser-warning: true" 2>/dev/null)

    if echo "$NGROK_RESPONSE" | grep -q "active"; then
        echo -e "${GREEN}✅ ngrok webhook is working${NC}"
        echo "   Full webhook URL: $NGROK_WEBHOOK"
    else
        echo -e "${RED}❌ ngrok webhook failed${NC}"
        echo "   Response: $NGROK_RESPONSE"
    fi
else
    echo -e "${YELLOW}⚠️  ngrok is not running${NC}"
    echo "   Start ngrok with: ngrok http 3002"
fi

echo -e "\n${GREEN}=================================="
echo "Setup Summary:"
echo "=================================="
echo "Local App:      http://localhost:3002"
if [ -n "$NGROK_URL" ]; then
    echo "Public URL:     $NGROK_URL"
    echo "Webhook URL:    ${NGROK_URL}/api/speechmatics/callback?token=speechmatics_webhook_secret_2024"
fi
echo -e "${NC}"
