#!/bin/bash
# Pre-build script for Render deployment
# This installs system dependencies needed for PyAudio

echo "Installing system dependencies for audio processing..."

# Update package list
apt-get update

# Install PortAudio development files
apt-get install -y portaudio19-dev python3-pyaudio libasound2-dev

echo "System dependencies installed successfully"
