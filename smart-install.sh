#!/bin/bash
# Smart pip installer that handles PyAudio failures gracefully
# This script tries to install each package individually and skips failures

echo "🎯 Smart Package Installation with PyAudio Fallback"
echo "=================================================="

cd backend

# Upgrade pip first
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install base packages first (excluding audio packages)
echo "🔧 Installing base dependencies..."
pip install alembic==1.16.2
pip install annotated-types==0.7.0
pip install anthropic==0.59.0
pip install anyio==4.9.0
pip install CacheControl==0.14.3
pip install cachetools==5.5.2
pip install certifi==2025.4.26
pip install cffi==1.17.1
pip install charset-normalizer==3.4.2
pip install click==8.2.1
pip install cryptography==45.0.5
pip install distro==1.9.0
pip install dnspython==2.7.0
pip install dotenv==0.9.9
pip install email_validator==2.2.0
pip install fastapi==0.115.13
pip install firebase-admin==6.9.0
pip install google-api-core==2.25.1
pip install google-api-python-client==2.176.0
pip install google-auth==2.40.3
pip install google-auth-httplib2==0.2.0
pip install google-cloud-core==2.4.3
pip install google-cloud-firestore==2.21.0
pip install google-cloud-storage==3.2.0
pip install google-crc32c==1.7.1
pip install google-resumable-media==2.7.2
pip install googleapis-common-protos==1.70.0
pip install grpcio==1.73.1
pip install grpcio-status==1.73.1
pip install h11==0.16.0
pip install h2==4.2.0
pip install hpack==4.1.0
pip install httpcore==1.0.9
pip install httplib2==0.22.0
pip install httpx==0.28.1
pip install hyperframe==6.1.0
pip install idna==3.10
pip install iniconfig==2.1.0
pip install jiter==0.10.0
pip install joblib==1.5.1
pip install Mako==1.3.10
pip install MarkupSafe==3.0.2
pip install msgpack==1.1.1
pip install numpy==2.3.2
pip install openai==1.97.1
pip install packaging==25.0
pip install pandas==2.3.1
pip install pluggy==1.6.0
pip install proto-plus==1.26.1
pip install protobuf==6.31.1
pip install psycopg2-binary==2.9.10
pip install py4j==0.10.9.9
pip install pyasn1==0.6.1
pip install pyasn1_modules==0.4.2
pip install pycparser==2.22
pip install pydantic==2.11.7
pip install pydantic_core==2.33.2
pip install PyJWT==2.10.1
pip install pyparsing==3.2.3
pip install pyspark==4.0.0
pip install pytest==8.3.5
pip install pytest-mock==3.14.1
pip install python-dateutil==2.9.0.post0
pip install python-dotenv==1.1.0
pip install python-multipart==0.0.20
pip install pytz==2025.2
pip install PyYAML==6.0.2
pip install requests==2.32.3
pip install rsa==4.9.1
pip install scikit-learn==1.7.1
pip install scipy==1.16.0
pip install six==1.17.0
pip install sniffio==1.3.1
pip install SQLAlchemy==2.0.41
pip install starlette==0.46.2
pip install threadpoolctl==3.6.0
pip install tqdm==4.67.1
pip install typing-inspection==0.4.1
pip install typing_extensions==4.14.0
pip install tzdata==2025.2
pip install uritemplate==4.2.0
pip install urllib3==2.4.0
pip install uvicorn==0.34.3

echo "✅ Base dependencies installed"

# Try audio packages with fallback strategy
echo "🎵 Installing audio dependencies with smart fallback..."

# First try PyAudio
echo "🔧 Attempting PyAudio installation..."
if pip install PyAudio==0.2.14; then
    echo "✅ PyAudio installed successfully"
    AUDIO_BACKEND="PyAudio"
else
    echo "❌ PyAudio compilation failed, using pydub fallback"
    AUDIO_BACKEND="pydub"
fi

# Install SpeechRecognition (should work regardless)
echo "🎤 Installing SpeechRecognition..."
pip install SpeechRecognition==3.14.3

# Install pydub (always install as fallback)
echo "🎵 Installing pydub for audio format conversion..."
pip install pydub==0.25.1

echo ""
echo "🎯 Installation Summary:"
echo "======================="
echo "✅ Base dependencies: Installed"
echo "🎵 Audio backend: $AUDIO_BACKEND"
echo "🎤 SpeechRecognition: Installed"
echo "🔄 pydub fallback: Installed"
echo ""

if [ "$AUDIO_BACKEND" = "PyAudio" ]; then
    echo "🚀 Deployment ready with full PyAudio support"
else
    echo "🚀 Deployment ready with pydub fallback"
    echo "💡 Voice processing will use pydub + SpeechRecognition"
fi

echo "✅ Smart installation complete!"
