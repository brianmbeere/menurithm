import json
import re
from typing import Dict, Optional, Tuple, List
from datetime import datetime
import logging
import tempfile
import os
from sqlalchemy.orm import Session

from app.models.inventory_enhanced import InventoryItemEnhanced, StockMovement
from app.schemas.inventory import InventoryItemIn

logger = logging.getLogger(__name__)

try:
    import speech_recognition as sr
    SPEECH_RECOGNITION_AVAILABLE = True
except ImportError:
    logger.warning("SpeechRecognition not available - voice features will be disabled")
    SPEECH_RECOGNITION_AVAILABLE = False
    sr = None

# Alternative audio processing for deployment environments
try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    logger.warning("pydub not available - limited audio format support")
    PYDUB_AVAILABLE = False
    AudioSegment = None

class VoiceInventoryService:
    """Service for processing voice commands for inventory management"""
    
    def __init__(self, db: Session):
        self.db = db
        if SPEECH_RECOGNITION_AVAILABLE:
            self.recognizer = sr.Recognizer()
        else:
            self.recognizer = None
            logger.warning("Voice recognition not available - PyAudio/SpeechRecognition dependencies missing")
        
        # Common phrases for inventory operations
        self.add_patterns = [
            r"add (\d+(?:\.\d+)?) (\w+) of (.+)",
            r"received (\d+(?:\.\d+)?) (\w+) (.+)",
            r"got (\d+(?:\.\d+)?) (\w+) of (.+)",
            r"stock (\d+(?:\.\d+)?) (\w+) (.+)"
        ]
        
        self.use_patterns = [
            r"used (\d+(?:\.\d+)?) (\w+) of (.+)",
            r"consumed (\d+(?:\.\d+)?) (\w+) (.+)",
            r"took (\d+(?:\.\d+)?) (\w+) of (.+)"
        ]
        
        self.check_patterns = [
            r"how much (.+) do we have",
            r"check (.+) stock",
            r"(.+) inventory level"
        ]
        
    def process_voice_command(self, audio_file_path: str, user_id: str) -> Dict:
        """Process voice command and execute inventory operation"""
        if not SPEECH_RECOGNITION_AVAILABLE:
            return {
                "success": False,
                "error": "Voice recognition not available - PyAudio/SpeechRecognition dependencies missing",
                "message": "Voice features are disabled on this deployment"
            }
            
        try:
            # Convert speech to text
            text, confidence = self._speech_to_text(audio_file_path)
            
            if confidence < 0.7:
                return {
                    "success": False,
                    "message": "Could not understand the command clearly. Please try again.",
                    "confidence": confidence
                }
            
            # Parse command
            command_type, operation_data = self._parse_inventory_command(text)
            
            if command_type == "unknown":
                return {
                    "success": False,
                    "message": f"Could not understand command: '{text}'. Try saying something like 'Add 5 pounds of chicken' or 'Used 2 cups of flour'",
                    "transcription": text,
                    "confidence": confidence
                }
            
            # Execute command
            result = self._execute_inventory_command(user_id, command_type, operation_data, text, confidence)
            result["transcription"] = text
            result["confidence"] = confidence
            
            return result
            
        except Exception as e:
            logger.error(f"Voice command processing error: {str(e)}")
            return {
                "success": False,
                "message": f"Error processing voice command: {str(e)}"
            }
    
    def _speech_to_text(self, audio_file_path: str) -> Tuple[str, float]:
        """Convert audio file to text using speech recognition"""
        if not SPEECH_RECOGNITION_AVAILABLE or not self.recognizer:
            raise Exception("Speech recognition not available")
            
        try:
            # Handle different audio formats
            processed_audio_path = self._prepare_audio_file(audio_file_path)
            
            with sr.AudioFile(processed_audio_path) as source:
                # Adjust for ambient noise
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio = self.recognizer.record(source)
            
            # Clean up temporary file if created
            if processed_audio_path != audio_file_path:
                try:
                    os.unlink(processed_audio_path)
                except:
                    pass
            
            # Use Google Speech Recognition (you can switch to other engines)
            text = self.recognizer.recognize_google(audio)
            
            # Confidence estimation (simplified - real implementations would be more sophisticated)
            confidence = min(1.0, len(text.split()) / 10)  # Longer phrases = higher confidence
            
            return text.lower(), confidence
            
        except sr.UnknownValueError:
            return "", 0.0
        except sr.RequestError as e:
            logger.error(f"Speech recognition service error: {e}")
            return "", 0.0
        except Exception as e:
            logger.error(f"Audio processing error: {e}")
            raise e
    
    def _prepare_audio_file(self, audio_file_path: str) -> str:
        """Prepare audio file for speech recognition (convert format if needed)"""
        try:
            # Try to read as AudioFile directly first
            with sr.AudioFile(audio_file_path) as source:
                # If this works, file is already in correct format
                return audio_file_path
        except Exception as e:
            logger.info(f"Direct audio file read failed: {e}, attempting conversion...")
            
            # If direct read fails, try to convert using pydub
            if not PYDUB_AVAILABLE:
                raise Exception(f"Audio file could not be read as PCM WAV, AIFF/AIFF-C, or Native FLAC; check if file is corrupted or in another format. pydub not available for conversion.")
            
            try:
                # Load audio with pydub (supports many formats)
                audio = AudioSegment.from_file(audio_file_path)
                
                # Convert to WAV format that speech_recognition can handle
                temp_fd, temp_path = tempfile.mkstemp(suffix='.wav')
                os.close(temp_fd)
                
                # Export as WAV with proper settings for speech recognition
                audio.export(
                    temp_path,
                    format="wav",
                    parameters=[
                        "-acodec", "pcm_s16le",  # 16-bit PCM
                        "-ac", "1",              # Mono
                        "-ar", "16000"           # 16kHz sample rate
                    ]
                )
                
                logger.info(f"Converted audio file from {audio_file_path} to {temp_path}")
                return temp_path
                
            except Exception as conversion_error:
                logger.error(f"Audio conversion failed: {conversion_error}")
                raise Exception(f"Audio file could not be read as PCM WAV, AIFF/AIFF-C, or Native FLAC; check if file is corrupted or in another format")
    
    def _parse_inventory_command(self, text: str) -> Tuple[str, Dict]:
        """Parse voice command to extract action and parameters"""
        text = text.strip().lower()
        
        # Try to match add/stock patterns
        for pattern in self.add_patterns:
            match = re.search(pattern, text)
            if match:
                quantity = float(match.group(1))
                unit = match.group(2)
                ingredient = match.group(3).strip()
                return "add", {
                    "ingredient": ingredient,
                    "quantity": quantity,
                    "unit": unit
                }
        
        # Try to match usage patterns
        for pattern in self.use_patterns:
            match = re.search(pattern, text)
            if match:
                quantity = float(match.group(1))
                unit = match.group(2)
                ingredient = match.group(3).strip()
                return "use", {
                    "ingredient": ingredient,
                    "quantity": quantity,
                    "unit": unit
                }
        
        # Try to match check patterns
        for pattern in self.check_patterns:
            match = re.search(pattern, text)
            if match:
                ingredient = match.group(1).strip()
                return "check", {
                    "ingredient": ingredient
                }
        
        return "unknown", {}
    
    def _execute_inventory_command(self, user_id: str, command_type: str, 
                                 operation_data: Dict, original_text: str, confidence: float) -> Dict:
        """Execute the parsed inventory command"""
        
        if command_type == "add":
            return self._add_inventory(user_id, operation_data, original_text, confidence)
        elif command_type == "use":
            return self._use_inventory(user_id, operation_data, original_text, confidence)
        elif command_type == "check":
            return self._check_inventory(user_id, operation_data)
        else:
            return {"success": False, "message": "Unknown command type"}
    
    def _add_inventory(self, user_id: str, data: Dict, original_text: str, confidence: float) -> Dict:
        """Add inventory via voice command"""
        try:
            ingredient_name = data["ingredient"].lower()
            quantity = data["quantity"]
            unit = data["unit"]
            
            # Find existing inventory item
            inventory_item = self.db.query(InventoryItemEnhanced).filter(
                InventoryItemEnhanced.user_id == user_id,
                InventoryItemEnhanced.ingredient_name.ilike(f"%{ingredient_name}%")
            ).first()
            
            if inventory_item:
                # Update existing item
                old_quantity = inventory_item.quantity
                inventory_item.quantity += quantity
                inventory_item.last_updated = datetime.utcnow()
                inventory_item.last_voice_update = datetime.utcnow()
                inventory_item.voice_notes = original_text
                
                # Record stock movement
                movement = StockMovement(
                    inventory_item_id=inventory_item.id,
                    user_id=user_id,
                    movement_type="voice_addition",
                    quantity_change=quantity,
                    quantity_before=old_quantity,
                    quantity_after=inventory_item.quantity,
                    reason="voice_input",
                    voice_input=True,
                    voice_confidence=confidence
                )
                self.db.add(movement)
                self.db.commit()
                
                return {
                    "success": True,
                    "message": f"Added {quantity} {unit} of {ingredient_name}. New total: {inventory_item.quantity} {unit}",
                    "action": "updated_existing",
                    "item_id": inventory_item.id
                }
            else:
                # Create new inventory item
                new_item = InventoryItemEnhanced(
                    user_id=user_id,
                    ingredient_name=ingredient_name,
                    quantity=quantity,
                    unit=unit,
                    category="voice_added",
                    last_voice_update=datetime.utcnow(),
                    voice_notes=original_text
                )
                self.db.add(new_item)
                self.db.flush()  # Get the ID
                
                # Record stock movement
                movement = StockMovement(
                    inventory_item_id=new_item.id,
                    user_id=user_id,
                    movement_type="voice_addition",
                    quantity_change=quantity,
                    quantity_before=0,
                    quantity_after=quantity,
                    reason="new_item_voice",
                    voice_input=True,
                    voice_confidence=confidence
                )
                self.db.add(movement)
                self.db.commit()
                
                return {
                    "success": True,
                    "message": f"Added new item: {quantity} {unit} of {ingredient_name}",
                    "action": "created_new",
                    "item_id": new_item.id
                }
                
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error adding inventory via voice: {str(e)}")
            return {
                "success": False,
                "message": f"Error adding inventory: {str(e)}"
            }
    
    def _use_inventory(self, user_id: str, data: Dict, original_text: str, confidence: float) -> Dict:
        """Record inventory usage via voice command"""
        try:
            ingredient_name = data["ingredient"].lower()
            quantity = data["quantity"]
            unit = data["unit"]
            
            # Find existing inventory item
            inventory_item = self.db.query(InventoryItemEnhanced).filter(
                InventoryItemEnhanced.user_id == user_id,
                InventoryItemEnhanced.ingredient_name.ilike(f"%{ingredient_name}%")
            ).first()
            
            if not inventory_item:
                return {
                    "success": False,
                    "message": f"Could not find {ingredient_name} in inventory"
                }
            
            old_quantity = inventory_item.quantity
            
            if inventory_item.quantity < quantity:
                return {
                    "success": False,
                    "message": f"Not enough {ingredient_name} in stock. Available: {inventory_item.quantity} {inventory_item.unit}, Requested: {quantity} {unit}"
                }
            
            # Update quantity
            inventory_item.quantity -= quantity
            inventory_item.last_updated = datetime.utcnow()
            inventory_item.last_voice_update = datetime.utcnow()
            inventory_item.voice_notes = original_text
            
            # Record stock movement
            movement = StockMovement(
                inventory_item_id=inventory_item.id,
                user_id=user_id,
                movement_type="voice_usage",
                quantity_change=-quantity,  # Negative for usage
                quantity_before=old_quantity,
                quantity_after=inventory_item.quantity,
                reason="dish_preparation",
                voice_input=True,
                voice_confidence=confidence
            )
            self.db.add(movement)
            self.db.commit()
            
            return {
                "success": True,
                "message": f"Used {quantity} {unit} of {ingredient_name}. Remaining: {inventory_item.quantity} {inventory_item.unit}",
                "action": "used_inventory",
                "item_id": inventory_item.id,
                "remaining_quantity": inventory_item.quantity
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error using inventory via voice: {str(e)}")
            return {
                "success": False,
                "message": f"Error using inventory: {str(e)}"
            }
    
    def _check_inventory(self, user_id: str, data: Dict) -> Dict:
        """Check inventory levels via voice command"""
        try:
            ingredient_name = data["ingredient"].lower()
            
            # Find inventory item
            inventory_item = self.db.query(InventoryItemEnhanced).filter(
                InventoryItemEnhanced.user_id == user_id,
                InventoryItemEnhanced.ingredient_name.ilike(f"%{ingredient_name}%")
            ).first()
            
            if not inventory_item:
                return {
                    "success": False,
                    "message": f"Could not find {ingredient_name} in inventory"
                }
            
            # Generate status message
            status_message = f"You have {inventory_item.quantity} {inventory_item.unit} of {inventory_item.ingredient_name}"
            
            # Add alerts if applicable
            if inventory_item.reorder_point and inventory_item.quantity <= inventory_item.reorder_point:
                status_message += ". Warning: Stock is low, consider reordering."
            elif inventory_item.expiry_date:
                days_to_expiry = (inventory_item.expiry_date - datetime.now().date()).days
                if days_to_expiry <= 3:
                    status_message += f". Alert: Expires in {days_to_expiry} days."
            
            return {
                "success": True,
                "message": status_message,
                "action": "inventory_check",
                "item_id": inventory_item.id,
                "quantity": inventory_item.quantity,
                "unit": inventory_item.unit
            }
            
        except Exception as e:
            logger.error(f"Error checking inventory via voice: {str(e)}")
            return {
                "success": False,
                "message": f"Error checking inventory: {str(e)}"
            }

class VoiceCommandProcessor:
    """Helper class for processing various voice commands"""
    
    @staticmethod
    def suggest_voice_commands() -> List[str]:
        """Return list of example voice commands for users"""
        return [
            "Add 5 pounds of chicken",
            "Received 3 cases of tomatoes", 
            "Used 2 cups of flour",
            "Consumed 1 gallon of milk",
            "How much rice do we have?",
            "Check tomato stock",
            "Stock 10 pounds of ground beef"
        ]
