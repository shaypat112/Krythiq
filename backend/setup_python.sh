#!/bin/bash

# Setup script for Python AI service dependencies
# This script installs the required Python packages for the AI code review service

set -e

echo "🐍 Setting up Python AI service for Votrio..."
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 --version | awk '{print $2}')
echo "✅ Found Python version: $PYTHON_VERSION"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip."
    exit 1
fi

echo "✅ Found pip3"
echo ""

# Install dependencies
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

echo ""
echo "✅ Python AI service setup complete!"
echo ""
echo "You can now use the AI code review service."
echo "The service will be automatically called when reviewing code."
