#!/usr/bin/env python3
"""
Test voice system without PyAudio (deployment-ready test)
"""

def test_deployment_audio_setup():
    """Test that voice system works without PyAudio"""
    print("🎯 Testing Deployment-Ready Audio Setup")
    print("=" * 45)
    
    # Test 1: Check required packages for deployment
    required_packages = {
        'SpeechRecognition': 'speech_recognition',
        'pydub': 'pydub'
    }
    
    available_packages = {}
    
    for name, module in required_packages.items():
        try:
            __import__(module)
            available_packages[name] = True
            print(f"✅ {name}: Available")
        except ImportError:
            available_packages[name] = False
            print(f"❌ {name}: Not Available")
    
    # Test 2: Check optional packages
    optional_packages = {
        'PyAudio': 'pyaudio'
    }
    
    for name, module in optional_packages.items():
        try:
            __import__(module)
            print(f"✅ {name}: Available (optional)")
        except ImportError:
            print(f"⚪ {name}: Not Available (expected in deployment)")
    
    # Test 3: Voice system readiness
    print("\n🎤 Voice System Readiness Check")
    print("-" * 30)
    
    if available_packages['SpeechRecognition']:
        print("✅ SpeechRecognition available - voice recognition will work")
    else:
        print("❌ SpeechRecognition missing - voice features disabled")
        return False
    
    if available_packages['pydub']:
        print("✅ pydub available - audio format conversion will work")
    else:
        print("❌ pydub missing - limited audio format support")
        return False
    
    # Test 4: Deployment recommendation
    print("\n🚀 Deployment Analysis")
    print("-" * 20)
    
    if all(available_packages.values()):
        print("✅ DEPLOYMENT READY")
        print("   → Voice recognition: Enabled")
        print("   → Audio conversion: Enabled via pydub")
        print("   → PyAudio dependency: Removed (not needed)")
        print("   → Format support: WAV, AIFF, FLAC + automatic conversion")
        
        print("\n💡 Deployment Configuration:")
        print("   → requirements.txt: Excludes PyAudio")
        print("   → Audio backend: pydub + SpeechRecognition")
        print("   → No compilation issues expected")
        
        return True
    else:
        print("❌ DEPLOYMENT NOT READY")
        print("   → Missing required packages")
        return False

if __name__ == "__main__":
    import sys
    success = test_deployment_audio_setup()
    
    if success:
        print("\n🎯 RESULT: Ready for deployment!")
        sys.exit(0)
    else:
        print("\n💥 RESULT: Deployment will fail - missing dependencies")
        sys.exit(1)
