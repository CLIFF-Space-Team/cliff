"""
Advanced Prompt Composition Service
Gelişmiş prompt kompozisyon ve optimize etme sistemi
Profesyonel fotoğraf terminolojisi, sanat teknikleri ve kompozisyon kuralları
"""

import asyncio
import json
import re
from typing import Dict, List, Optional, Any, Tuple, Set
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
import structlog

logger = structlog.get_logger(__name__)

class PhotographyTechnique(str, Enum):
    """Profesyonel fotoğraf teknikleri"""
    GOLDEN_HOUR = "golden_hour"
    BLUE_HOUR = "blue_hour"
    MACRO = "macro"
    LONG_EXPOSURE = "long_exposure"
    HDR = "hdr"
    BOKEH = "bokeh"
    SILHOUETTE = "silhouette"
    REFLECTION = "reflection"
    SYMMETRY = "symmetry"
    LEADING_LINES = "leading_lines"
    RULE_OF_THIRDS = "rule_of_thirds"
    DEPTH_OF_FIELD = "depth_of_field"

class ColorTheory(str, Enum):
    """Renk teorisi yaklaşımları"""
    COMPLEMENTARY = "complementary"
    ANALOGOUS = "analogous"
    TRIADIC = "triadic"
    MONOCHROMATIC = "monochromatic"
    SPLIT_COMPLEMENTARY = "split_complementary"
    WARM_PALETTE = "warm_palette"
    COOL_PALETTE = "cool_palette"
    HIGH_CONTRAST = "high_contrast"
    LOW_CONTRAST = "low_contrast"

class ArtisticMovement(str, Enum):
    """Sanatsal akımlar"""
    IMPRESSIONISM = "impressionism"
    SURREALISM = "surrealism"
    MINIMALISM = "minimalism"
    ABSTRACT_EXPRESSIONISM = "abstract_expressionism"
    BAROQUE = "baroque"
    ART_NOUVEAU = "art_nouveau"
    CONTEMPORARY = "contemporary"
    PHOTOREALISM = "photorealism"

class LightingSetup(str, Enum):
    """Işıklandırma kurulumları"""
    GOLDEN_HOUR = "golden_hour"
    NATURAL_LIGHT = "natural_light"
    STUDIO_LIGHTING = "studio_lighting"
    REMBRANDT_LIGHTING = "rembrandt_lighting"
    BUTTERFLY_LIGHTING = "butterfly_lighting"
    SPLIT_LIGHTING = "split_lighting"
    BROAD_LIGHTING = "broad_lighting"
    SHORT_LIGHTING = "short_lighting"
    BACKLIGHTING = "backlighting"
    RIM_LIGHTING = "rim_lighting"
    DRAMATIC_LIGHTING = "dramatic_lighting"

@dataclass
class CompositionRule:
    """Kompozisyon kuralı"""
    name: str
    description: str
    prompt_additions: List[str]
    weight: float  # 0.0 - 1.0 arası önem seviyesi

@dataclass  
class VisualElement:
    """Görsel öğe"""
    element_type: str
    descriptors: List[str]
    enhancement_terms: List[str]
    professional_terms: List[str]

class AdvancedPromptComposer:
    """
    Gelişmiş prompt kompozisyon sistemi
    Profesyonel fotoğraf, sanat ve tasarım teknikleri ile optimize edilmiş prompt üretimi
    """
    
    def __init__(self):
        # Profesyonel fotoğraf terminolojisi
        self.photography_terms = {
            "quality": [
                "ultra-high resolution", "professional photography", "award-winning",
                "gallery-quality", "museum-quality", "commercial-grade", "studio-quality",
                "professional equipment", "technical excellence", "pristine quality"
            ],
            "technical": [
                "perfect exposure", "optimal white balance", "accurate color reproduction",
                "razor-sharp focus", "professional color grading", "perfect composition",
                "exceptional dynamic range", "noise-free", "professional post-processing"
            ],
            "equipment": [
                "medium format camera", "professional lens", "Carl Zeiss optics",
                "Leica quality", "Canon 85mm f/1.2", "Nikon D850", "Phase One",
                "Hasselblad medium format", "professional tripod mounted"
            ]
        }
        
        # Sanatsal kompozisyon kuralları - String key ile düzeltildi
        self.composition_rules = {
            "rule_of_thirds": CompositionRule(
                name="Rule of Thirds",
                description="Subject positioned along thirds grid lines",
                prompt_additions=["rule of thirds composition", "balanced placement", "dynamic positioning"],
                weight=0.8
            ),
            "golden_ratio": CompositionRule(
                name="Golden Ratio",
                description="Fibonacci spiral composition",
                prompt_additions=["golden ratio composition", "fibonacci spiral", "divine proportion"],
                weight=0.7
            ),
            "leading_lines": CompositionRule(
                name="Leading Lines",
                description="Lines that guide the eye to subject",
                prompt_additions=["strong leading lines", "directional composition", "eye-guiding elements"],
                weight=0.6
            ),
            "symmetry": CompositionRule(
                name="Symmetry",
                description="Perfect or near-perfect symmetrical balance",
                prompt_additions=["perfect symmetry", "balanced composition", "mirror-like balance"],
                weight=0.5
            ),
            "depth_layering": CompositionRule(
                name="Depth Layering",
                description="Foreground, midground, background layers",
                prompt_additions=["layered composition", "depth of field layers", "dimensional depth"],
                weight=0.7
            )
        }
        
        # Renk teorisi uygulamaları
        self.color_applications = {
            ColorTheory.COMPLEMENTARY: [
                "complementary color scheme", "opposing colors harmony", "vibrant contrast"
            ],
            ColorTheory.ANALOGOUS: [
                "analogous color harmony", "color gradient harmony", "seamless color flow"
            ],
            ColorTheory.WARM_PALETTE: [
                "warm color palette", "golden tones", "sunset colors", "amber lighting"
            ],
            ColorTheory.COOL_PALETTE: [
                "cool color palette", "blue tones", "ice-cold colors", "arctic atmosphere"
            ],
            ColorTheory.MONOCHROMATIC: [
                "monochromatic color scheme", "single color variations", "tonal harmony"
            ]
        }
        
        # Işıklandırma teknikleri
        self.lighting_techniques = {
            LightingSetup.GOLDEN_HOUR: [
                "golden hour lighting", "warm natural light", "magical hour", "soft sunset glow"
            ],
            LightingSetup.STUDIO_LIGHTING: [
                "professional studio lighting", "controlled lighting setup", "perfect illumination"
            ],
            LightingSetup.DRAMATIC_LIGHTING: [
                "dramatic lighting", "high contrast shadows", "cinematic lighting", "chiaroscuro"
            ],
            LightingSetup.NATURAL_LIGHT: [
                "beautiful natural lighting", "window light", "ambient daylight", "soft diffused light"
            ]
        }
        
        # Sanatsal akım terimleri
        self.artistic_movements = {
            ArtisticMovement.IMPRESSIONISM: [
                "impressionist style", "soft brushstrokes effect", "light and color focus"
            ],
            ArtisticMovement.SURREALISM: [
                "surrealist interpretation", "dreamlike quality", "impossible geometry"
            ],
            ArtisticMovement.MINIMALISM: [
                "minimalist composition", "clean lines", "negative space mastery"
            ],
            ArtisticMovement.PHOTOREALISM: [
                "photorealistic quality", "hyperrealistic details", "life-like precision"
            ]
        }
        
        # Görsel etki artırıcıları
        self.visual_enhancers = {
            "atmosphere": [
                "atmospheric perspective", "mood lighting", "ethereal atmosphere",
                "cinematic atmosphere", "dramatic mood", "intimate setting"
            ],
            "texture": [
                "rich textures", "tactile surfaces", "material definition",
                "surface detail", "texture contrast", "material authenticity"
            ],
            "movement": [
                "dynamic movement", "captured motion", "kinetic energy",
                "fluid dynamics", "frozen motion", "motion blur artistry"
            ],
            "emotion": [
                "emotional resonance", "evocative mood", "psychological depth",
                "human connection", "emotional storytelling", "compelling narrative"
            ]
        }
        
        logger.info("Advanced Prompt Composer initialized with professional techniques")
    
    def analyze_content_complexity(self, content: str) -> Dict[str, Any]:
        """
        İçerik karmaşıklığını analiz et
        """
        words = content.split()
        word_count = len(words)
        
        # Teknik terimler
        technical_keywords = [
            "technical", "scientific", "engineering", "mathematical", "analytical",
            "research", "study", "analysis", "methodology", "systematic"
        ]
        
        # Sanatsal terimler
        artistic_keywords = [
            "beautiful", "artistic", "creative", "elegant", "aesthetic", "stylistic",
            "expressive", "imaginative", "innovative", "visionary", "inspiring"
        ]
        
        # Duygusal terimler
        emotional_keywords = [
            "dramatic", "peaceful", "energetic", "melancholic", "joyful", "mysterious",
            "powerful", "gentle", "intense", "serene", "passionate", "contemplative"
        ]
        
        content_lower = content.lower()
        
        technical_score = sum(1 for kw in technical_keywords if kw in content_lower)
        artistic_score = sum(1 for kw in artistic_keywords if kw in content_lower) 
        emotional_score = sum(1 for kw in emotional_keywords if kw in content_lower)
        
        complexity_level = "simple"
        if word_count > 50:
            complexity_level = "complex"
        elif word_count > 20:
            complexity_level = "medium"
        
        dominant_aspect = "neutral"
        max_score = max(technical_score, artistic_score, emotional_score)
        if max_score > 0:
            if technical_score == max_score:
                dominant_aspect = "technical"
            elif artistic_score == max_score:
                dominant_aspect = "artistic"
            else:
                dominant_aspect = "emotional"
        
        return {
            "word_count": word_count,
            "complexity_level": complexity_level,
            "technical_score": technical_score,
            "artistic_score": artistic_score,
            "emotional_score": emotional_score,
            "dominant_aspect": dominant_aspect,
            "requires_professional_terms": max_score > 1 or word_count > 30
        }
    
    def select_optimal_techniques(self, content: str, style_preference: Optional[str] = None,
                                content_type: Optional[str] = None) -> Dict[str, Any]:
        """
        İçeriğe en uygun teknikleri seç
        """
        analysis = self.analyze_content_complexity(content)
        content_lower = content.lower()
        
        selected_techniques = {
            "photography": [],
            "composition": [],
            "lighting": [],
            "color": [],
            "artistic_movement": None,
            "visual_enhancers": []
        }
        
        # Fotoğraf tekniği seçimi
        if "macro" in content_lower or "detail" in content_lower or "close" in content_lower:
            selected_techniques["photography"].extend([
                "macro photography excellence", "ultra-sharp detail focus",
                "perfect depth of field control"
            ])
        
        if "landscape" in content_lower or "wide" in content_lower or "panoramic" in content_lower:
            selected_techniques["photography"].extend([
                "landscape photography mastery", "wide-angle composition",
                "environmental storytelling"
            ])
        
        if "portrait" in content_lower or "face" in content_lower or "person" in content_lower:
            selected_techniques["photography"].extend([
                "portrait photography excellence", "perfect skin tones",
                "compelling eye contact"
            ])
        
        # Kompozisyon kuralı seçimi
        if analysis["complexity_level"] in ["medium", "complex"]:
            selected_techniques["composition"].extend([
                "rule of thirds mastery", "dynamic composition",
                "visual balance excellence"
            ])
        
        # Işıklandırma seçimi
        if "sunset" in content_lower or "golden" in content_lower:
            selected_techniques["lighting"] = self.lighting_techniques[LightingSetup.GOLDEN_HOUR]
        elif "dramatic" in content_lower or "moody" in content_lower:
            selected_techniques["lighting"] = self.lighting_techniques[LightingSetup.DRAMATIC_LIGHTING]
        else:
            selected_techniques["lighting"] = self.lighting_techniques[LightingSetup.NATURAL_LIGHT]
        
        # Renk teorisi seçimi
        if "warm" in content_lower or "sunset" in content_lower or "fire" in content_lower:
            selected_techniques["color"] = self.color_applications[ColorTheory.WARM_PALETTE]
        elif "cool" in content_lower or "ice" in content_lower or "winter" in content_lower:
            selected_techniques["color"] = self.color_applications[ColorTheory.COOL_PALETTE]
        else:
            selected_techniques["color"] = self.color_applications[ColorTheory.COMPLEMENTARY]
        
        # Sanatsal akım seçimi
        if analysis["dominant_aspect"] == "artistic":
            if "dream" in content_lower or "surreal" in content_lower:
                selected_techniques["artistic_movement"] = ArtisticMovement.SURREALISM
            elif "minimal" in content_lower or "clean" in content_lower:
                selected_techniques["artistic_movement"] = ArtisticMovement.MINIMALISM
            else:
                selected_techniques["artistic_movement"] = ArtisticMovement.CONTEMPORARY
        elif analysis["dominant_aspect"] == "technical":
            selected_techniques["artistic_movement"] = ArtisticMovement.PHOTOREALISM
        
        # Görsel etki artırıcıları
        if analysis["emotional_score"] > 0:
            selected_techniques["visual_enhancers"].extend(self.visual_enhancers["emotion"][:2])
        if analysis["artistic_score"] > 0:
            selected_techniques["visual_enhancers"].extend(self.visual_enhancers["atmosphere"][:2])
        
        return selected_techniques
    
    def compose_professional_prompt(self, base_prompt: str, selected_techniques: Dict[str, Any],
                                  quality_level: str = "high") -> str:
        """
        Profesyonel prompt kompoze et
        """
        components = [base_prompt.strip()]
        
        # Kalite terimleri ekle
        if quality_level == "high":
            components.extend(self.photography_terms["quality"][:3])
            components.extend(self.photography_terms["technical"][:2])
        
        # Seçilen teknikleri ekle
        for technique_type, techniques in selected_techniques.items():
            if technique_type == "artistic_movement" and techniques:
                movement_terms = self.artistic_movements.get(techniques, [])
                components.extend(movement_terms[:1])
            elif isinstance(techniques, list) and techniques:
                components.extend(techniques[:2])  # Her kategori için maksimum 2 terim
        
        # Ekipman referansları (yüksek kalite için)
        if quality_level == "high":
            components.extend(self.photography_terms["equipment"][:1])
        
        # Birleştir ve temizle
        final_prompt = ", ".join(components)
        
        # Tekrar eden terimleri temizle
        final_prompt = self._remove_duplicates(final_prompt)
        
        return final_prompt
    
    def _remove_duplicates(self, prompt: str) -> str:
        """Prompt'tan tekrar eden terimleri kaldır"""
        terms = [term.strip() for term in prompt.split(",")]
        seen = set()
        unique_terms = []
        
        for term in terms:
            term_lower = term.lower()
            if term_lower not in seen and term.strip():
                seen.add(term_lower)
                unique_terms.append(term.strip())
        
        return ", ".join(unique_terms)
    
    async def enhance_with_advanced_composition(self, user_input: str, 
                                              style_preference: Optional[str] = None,
                                              creativity_level: float = 0.8,
                                              quality_level: str = "high") -> Dict[str, Any]:
        """
        Gelişmiş kompozisyon teknikleri ile prompt'u geliştir
        """
        try:
            start_time = datetime.now()
            
            logger.info(f"Advanced composition enhancement: {user_input[:50]}...")
            
            # Optimal teknikleri seç
            selected_techniques = self.select_optimal_techniques(
                user_input, style_preference
            )
            
            # Profesyonel prompt kompoze et
            enhanced_prompt = self.compose_professional_prompt(
                user_input, selected_techniques, quality_level
            )
            
            # İçerik analizi
            content_analysis = self.analyze_content_complexity(user_input)
            
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            # Öneriler oluştur
            suggestions = self._generate_composition_suggestions(
                content_analysis, selected_techniques
            )
            
            logger.info(f"Advanced composition completed in {processing_time}ms")
            
            return {
                "success": True,
                "original_input": user_input,
                "enhanced_prompt": enhanced_prompt,
                "content_analysis": content_analysis,
                "selected_techniques": selected_techniques,
                "suggestions": suggestions,
                "confidence_score": 0.9,  # Yüksek güven - profesyonel teknikler kullanıldı
                "processing_time_ms": processing_time,
                "quality_enhancements_applied": quality_level == "high"
            }
            
        except Exception as e:
            logger.error(f"Advanced composition error: {str(e)}")
            return {
                "success": False,
                "original_input": user_input,
                "error_message": str(e),
                "fallback_prompt": f"Professional high-quality image of {user_input}"
            }
    
    def _generate_composition_suggestions(self, content_analysis: Dict[str, Any],
                                        selected_techniques: Dict[str, Any]) -> List[str]:
        """Kompozisyon önerileri oluştur"""
        suggestions = []
        
        if content_analysis["complexity_level"] == "simple":
            suggestions.append("Consider adding more descriptive details for richer visual output")
        
        if content_analysis["dominant_aspect"] == "technical":
            suggestions.append("Technical content enhanced with professional photography terms")
        elif content_analysis["dominant_aspect"] == "artistic":
            suggestions.append("Artistic elements enhanced with creative composition techniques")
        
        if selected_techniques["artistic_movement"]:
            suggestions.append(f"Applied {selected_techniques['artistic_movement'].value} artistic style")
        
        suggestions.extend([
            "Professional photography standards applied",
            "Color theory and lighting principles integrated",
            "Composition rules optimized for visual impact",
            "Technical excellence terms included for commercial quality"
        ])
        
        return suggestions[:4]  # Maksimum 4 öneri
    
    def get_technique_categories(self) -> Dict[str, Any]:
        """Mevcut teknik kategorilerini döndür"""
        return {
            "photography_techniques": [t.value for t in PhotographyTechnique],
            "color_theories": [c.value for c in ColorTheory], 
            "artistic_movements": [a.value for a in ArtisticMovement],
            "lighting_setups": [l.value for l in LightingSetup],
            "composition_rules": len(self.composition_rules),
            "visual_enhancers": list(self.visual_enhancers.keys()),
            "professional_terms_count": sum(len(terms) for terms in self.photography_terms.values())
        }

# Global instance
advanced_prompt_composer = AdvancedPromptComposer()

async def get_advanced_composer() -> AdvancedPromptComposer:
    """Dependency injection için"""
    return advanced_prompt_composer

# Yardımcı fonksiyonlar
async def enhance_with_professional_composition(user_input: str, 
                                              style: Optional[str] = None,
                                              quality: str = "high") -> str:
    """Hızlı profesyonel geliştirme"""
    result = await advanced_prompt_composer.enhance_with_advanced_composition(
        user_input, style, 0.8, quality
    )
    return result.get("enhanced_prompt", user_input)