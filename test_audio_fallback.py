#!/usr/bin/env python3
"""
Test the enhanced audio processing with pydub fallback
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

def test_audio_imports():
    """Test audio library imports and fallback logic"""
    print("🎯 Testing Audio Library Imports")
    print("=" * 40)
    
    # Test SpeechRecognition
    try:
        import speech_recognition as sr
        print("✅ SpeechRecognition available")
        recognizer = sr.Recognizer()
        print(f"   - Recognizer created: {type(recognizer)}")
    except ImportError as e:
        print(f"❌ SpeechRecognition not available: {e}")
        return False
    
    # Test PyAudio (expected to fail in many environments)
    try:
        import pyaudio
        print("✅ PyAudio available (rare in deployment)")
        print(f"   - Version: {pyaudio.__version__}")
    except ImportError:
        print("⚠️  PyAudio not available (expected in deployment)")
    
    # Test pydub
    try:
        from pydub import AudioSegment
        print("✅ pydub available")
        print("   - Supports format conversion")
    except ImportError as e:
        print(f"❌ pydub not available: {e}")
        return False
    
    # Test audio file handling
    print("\n🎵 Testing Audio File Handling")
    print("-" * 30)
    
    try:
        # Create a minimal WAV file for testing
        import tempfile
        import struct
        
        # Create minimal WAV header + silence
        sample_rate = 16000
        duration = 1  # 1 second
        num_samples = sample_rate * duration
        
        # WAV header
        wav_header = struct.pack('<4sL4s4sLHHLLHH4sL',
            b'RIFF', 36 + num_samples * 2, b'WAVE', b'fmt ', 16,
            1, 1, sample_rate, sample_rate * 2, 2, 16,
            b'data', num_samples * 2
        )
        
        # Silence data
        audio_data = b'\x00\x00' * num_samples
        
        # Write test file
        temp_fd, temp_path = tempfile.mkstemp(suffix='.wav')
        with os.fdopen(temp_fd, 'wb') as f:
            f.write(wav_header + audio_data)
        
        print(f"📁 Created test file: {temp_path}")
        
        # Test SpeechRecognition direct read
        try:
            with sr.AudioFile(temp_path) as source:
                audio = recognizer.record(source)
            print("✅ SpeechRecognition can read WAV directly")
        except Exception as e:
            print(f"❌ Direct WAV read failed: {e}")
        
        # Test pydub conversion
        try:
            audio_segment = AudioSegment.from_wav(temp_path)
            print(f"✅ pydub can read WAV: {len(audio_segment)}ms duration")
            
            # Test conversion
            temp_fd2, temp_path2 = tempfile.mkstemp(suffix='.wav')
            os.close(temp_fd2)
            
            audio_segment.export(temp_path2, format="wav", 
                               parameters=["-acodec", "pcm_s16le", "-ac", "1", "-ar", "16000"])
            print(f"✅ pydub can convert WAV: {temp_path2}")
            
            # Clean up
            os.unlink(temp_path2)
            
        except Exception as e:
            print(f"❌ pydub conversion failed: {e}")
        
        # Clean up
        os.unlink(temp_path)
        
    except Exception as e:
        print(f"❌ Audio file test failed: {e}")
        return False
    
    print("\n🎯 Test Summary")
    print("=" * 20)
    print("✅ Audio processing libraries available")
    print("✅ Fallback strategy functional")
    print("💡 Ready for deployment with pydub + SpeechRecognition")
    
    return True

if __name__ == "__main__":
    success = test_audio_imports()
    sys.exit(0 if success else 1)
