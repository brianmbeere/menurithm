#!/bin/bash
# Pre-build script for Render deployment
# This installs system dependencies needed for audio processing with fallback strategies

echo "🎯 Installing system dependencies for audio processing..."

# Update package list
apt-get update

# Install essential build tools
echo "📦 Installing build tools..."
apt-get install -y \
    build-essential \
    gcc \
    g++ \
    make \
    pkg-config

# Install PortAudio development files and related audio libraries
echo "🎵 Installing PortAudio dependencies..."
apt-get install -y \
    portaudio19-dev \
    libportaudio2 \
    libportaudiocpp0 \
    libasound2-dev \
    libasound2 \
    alsa-utils \
    alsa-base

# Install FFmpeg and audio processing libraries (for pydub fallback)
echo "🔧 Installing FFmpeg and audio codecs..."
apt-get install -y \
    ffmpeg \
    libavcodec-dev \
    libavformat-dev \
    libavutil-dev \
    libswresample-dev \
    libsndfile1-dev \
    libffi-dev

# Clean up package cache to reduce image size
apt-get clean
rm -rf /var/lib/apt/lists/*

echo "✅ System dependencies installed successfully"

# Verify PortAudio installation
echo "🔍 Verifying PortAudio installation..."
if pkg-config --exists portaudio-2.0; then
    echo "✅ PortAudio found"
    echo "📊 PortAudio version: $(pkg-config --modversion portaudio-2.0)"
else
    echo "⚠️  PortAudio pkg-config not found"
fi

# Check if portaudio.h is available
if [ -f "/usr/include/portaudio.h" ] || [ -f "/usr/local/include/portaudio.h" ]; then
    echo "✅ portaudio.h header file found"
else
    echo "⚠️  portaudio.h header file not found in standard locations"
    echo "🔍 Searching for PortAudio headers..."
    HEADER_LOCATIONS=$(find /usr -name "portaudio.h" 2>/dev/null)
    if [ -n "$HEADER_LOCATIONS" ]; then
        echo "📍 Found PortAudio headers at:"
        echo "$HEADER_LOCATIONS"
    else
        echo "❌ No PortAudio headers found - PyAudio compilation may fail"
        echo "💡 Will fallback to pydub-based audio processing"
    fi
fi

# Check FFmpeg installation
echo "🎬 Verifying FFmpeg installation..."
if command -v ffmpeg >/dev/null 2>&1; then
    echo "✅ FFmpeg found: $(ffmpeg -version | head -n1)"
else
    echo "❌ FFmpeg not found"
fi

echo "🎯 Prebuild setup complete!"
echo "💡 If PyAudio installation fails, the system will fallback to:"
echo "   - pydub for audio format conversion"
echo "   - SpeechRecognition with alternative backends"
