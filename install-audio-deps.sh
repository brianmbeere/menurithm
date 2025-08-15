#!/bin/bash
# Smart dependency installer for Render deployment
# Tries PyAudio first, falls back to pydub-only if compilation fails

echo "🎯 Smart Audio Dependencies Installer"
echo "======================================"

cd backend

# Try installing with PyAudio first
echo "🔧 Attempting full installation with PyAudio..."
if pip install -r requirements.txt; then
    echo "✅ Full installation successful (including PyAudio)"
    echo "🎵 Voice recognition will use PyAudio + SpeechRecognition"
else
    echo "❌ PyAudio installation failed, trying fallback approach..."
    
    # Install base requirements without PyAudio
    echo "📦 Installing base requirements..."
    pip install --no-deps -r requirements-deploy.txt
    
    # Try installing SpeechRecognition without PyAudio
    echo "🎤 Installing SpeechRecognition..."
    pip install SpeechRecognition==3.14.3
    
    # Install pydub for audio processing
    echo "🎵 Installing pydub for audio processing..."
    pip install pydub==0.25.1
    
    echo "✅ Fallback installation complete"
    echo "🔧 Voice recognition will use pydub + SpeechRecognition (no PyAudio)"
    echo "💡 Audio format conversion will be handled by pydub + FFmpeg"
fi

echo "🎯 Audio dependency setup complete!"
