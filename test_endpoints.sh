#!/bin/bash
API_URL="http://15.204.83.117:8000"
TOKEN="sk-v4l-MdI7-aclT18hH:6V4-uklvH-2026"

echo "Testing Health Endpoint..."
curl -s "$API_URL/api/health" | jq .

echo -e "\nTesting Users Endpoint..."
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/users" | jq .

echo -e "\nTesting Strategy Endpoint..."
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/strategy" | jq .
