export interface KotlinCodeFile {
  name: string;
  category: "ui" | "viewmodel" | "pipeline" | "theme" | "manifest";
  description: string;
  code: string;
}

export const JETPACK_COMPOSE_ARCHITECTURE: KotlinCodeFile[] = [
  {
    name: "MainActivity.kt",
    category: "ui",
    description: "App Entry Point with Material 3 Navigation & TTS Service initialization",
    code: `package com.sih2026.kalakriti

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.sih2026.kalakriti.ui.theme.KalaKritiTheme
import com.sih2026.kalakriti.viewmodel.ArtisanViewModel
import com.sih2026.kalakriti.ui.screens.*

/**
 * Smart India Hackathon (SIH 2026 Problem ID 26090)
 * Native Android Architecture - Principal Mobile Solutions
 */
class MainActivity : ComponentActivity() {
    private val artisanViewModel: ArtisanViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            KalaKritiTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    KalaKritiNavHost(viewModel = artisanViewModel)
                }
            }
        }
    }
}`,
  },
  {
    name: "ArtisanViewModel.kt",
    category: "viewmodel",
    description: "Unidirectional State Management (UDF) handling voice recording, studio canvas, & Gemini AI",
    code: `package com.sih2026.kalakriti.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sih2026.kalakriti.data.models.*
import com.sih2026.kalakriti.services.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class ArtisanUiState(
    val currentScreen: Int = 1,
    val selectedCraft: CraftCategory? = null,
    val rawImageUri: String? = null,
    val studioImageUri: String? = null,
    val isStudioProcessing: Boolean = false,
    val isRecordingVoice: Boolean = false,
    val voiceTranscript: String = "",
    val catalogData: CatalogItem? = null,
    val selectedPriceTier: PriceTier = PriceTier.RECOMMENDED,
    val isPublishing: Boolean = false,
    val isPublishedSuccess: Boolean = false,
    val language: String = "hi-IN"
)

class ArtisanViewModel(
    private val studioPipeline: ImageStudioPipeline = ImageStudioPipeline(),
    private val geminiEngine: GeminiMultimodalEngine = GeminiMultimodalEngine(),
    private val ttsEngine: TextToSpeechService = TextToSpeechService()
) : ViewModel() {

    private val _uiState = MutableStateFlow(ArtisanUiState())
    val uiState: StateFlow<ArtisanUiState> = _uiState.asStateFlow()

    fun selectCraft(craft: CraftCategory) {
        _uiState.update { it.copy(selectedCraft = craft, currentScreen = 2) }
        ttsEngine.speak("आपने " + craft.nameHi + " चुना है। अब अपने उत्पाद का फोटो खींचें।")
    }

    fun processCapturedImage(rawUri: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isStudioProcessing = true, rawImageUri = rawUri) }
            val studioUri = studioPipeline.removeBackgroundAndEnhance(rawUri)
            _uiState.update { 
                it.copy(
                    isStudioProcessing = false, 
                    studioImageUri = studioUri,
                    currentScreen = 3
                ) 
            }
            ttsEngine.speak("फोटो तैयार है। अब माइक दबाकर उत्पाद के बारे में बताएं।")
        }
    }

    fun submitVoiceNote(spokenText: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isRecordingVoice = false, voiceTranscript = spokenText) }
            val catalog = geminiEngine.parseVoiceAndGenerateCatalog(
                voiceText = spokenText,
                craft = _uiState.value.selectedCraft
            )
            _uiState.update { it.copy(catalogData = catalog, currentScreen = 4) }
            ttsEngine.speak(catalog.pricing.explanationHi)
        }
    }

    fun selectPriceTier(tier: PriceTier) {
        _uiState.update { it.copy(selectedPriceTier = tier) }
    }

    fun publishToMarketplace() {
        viewModelScope.launch {
            _uiState.update { it.copy(isPublishing = true) }
            // ONDC & E-Commerce API Dispatch
            _uiState.update { it.copy(isPublishing = false, isPublishedSuccess = true) }
            ttsEngine.speak("बधाई हो! आपका उत्पाद ई-मार्केटप्लेस पर सफलतापूर्वक लाइव हो गया है।")
        }
    }
}`,
  },
  {
    name: "StudioProcessingPipeline.kt",
    category: "pipeline",
    description: "On-device Background Removal & Neural Studio Lighting adjustments",
    code: `package com.sih2026.kalakriti.services

import android.graphics.Bitmap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class ImageStudioPipeline {
    
    suspend fun removeBackgroundAndEnhance(imageUri: String): String = withContext(Dispatchers.Default) {
        // 1. Neural Foreground Segmentation (Subject Isolation)
        // 2. Drop Soft Gradient Studio Pedestal & Contact Shadow (#F8FAFC)
        // 3. Dynamic Contrast & Sharpness Boost for craft textures
        return@withContext "studio_enhanced_$imageUri"
    }
}`,
  },
  {
    name: "GeminiMultimodalEngine.kt",
    category: "pipeline",
    description: "Gemini 3.7 Flash server-side integration for multimodal speech & JSON catalog structuring",
    code: `package com.sih2026.kalakriti.services

import com.sih2026.kalakriti.data.models.*

class GeminiMultimodalEngine {
    
    suspend fun parseVoiceAndGenerateCatalog(
        voiceText: String, 
        craft: CraftCategory?
    ): CatalogItem {
        // POST to backend /api/gemini/parse-voice
        // Returns structured JSON with physical specs, bilingual descriptions, and INR pricing
        return CatalogItem(
            titleHi = "हस्तनिर्मित पारंपरिक मिट्टी का दीया",
            titleEn = "Handcrafted Traditional Terracotta Diya",
            // ...
        )
    }
}`,
  },
  {
    name: "Material3Theme.kt",
    category: "theme",
    description: "Design System: Deep Slate #1E293B, Warm Clay #D96B43, and Soft Off-White #F8FAFC",
    code: `package com.sih2026.kalakriti.ui.theme

import androidx.compose.material3.*
import androidx.compose.ui.graphics.Color

val DeepSlate = Color(0xFF1E293B)
val WarmClay = Color(0xFFD96B43)
val SoftOffWhite = Color(0xFFF8FAFC)
val ForestGreen = Color(0xFF16A34A)
val RoyalBlue = Color(0xFF2563EB)
val RegalPurple = Color(0xFF9333EA)

val KalaKritiColorScheme = lightColorScheme(
    primary = DeepSlate,
    secondary = WarmClay,
    background = SoftOffWhite,
    surface = Color.White,
    onPrimary = Color.White,
    onSecondary = Color.White
)`,
  },
];
