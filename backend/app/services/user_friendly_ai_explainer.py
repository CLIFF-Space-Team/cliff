"""
🤖 User-Friendly AI Explainer Service
Teknik AI sonuçlarını kullanıcı dostu, sade Türkçe açıklamalara çeviren servis
"""

import re
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import structlog

logger = structlog.get_logger(__name__)

class UserFriendlyAIExplainer:
    """
    AI analiz sonuçlarını herkesin anlayabileceği sade dilde açıklayan servis
    """
    
    def __init__(self):
        self.threat_level_explanations = {
            "LOW": "Düşük risk - Güvenli",
            "MEDIUM": "Orta risk - İzleme gerekli", 
            "HIGH": "Yüksek risk - Dikkatli takip",
            "CRITICAL": "Kritik risk - Acil izleme"
        }
        
        self.distance_contexts = {
            (0, 100000): "Çok yakın - Ay mesafesi",
            (100000, 1000000): "Yakın - Ay'dan uzak",
            (1000000, 10000000): "Güvenli mesafe - Normal uzaklık",
            (10000000, float('inf')): "Çok uzak - Mars arası mesafe"
        }
    
    def explain_threat_analysis(self, analysis_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        AI analiz sonuçlarını kullanıcı dostu açıklamalara çevir
        """
        try:
            logger.info("Kullanıcı dostu açıklama oluşturuluyor...")
            
            # Temel bilgileri çıkar
            summary = analysis_results.get("summary", {})
            insights = analysis_results.get("key_insights", [])
            actions = analysis_results.get("immediate_actions", [])
            
            # Ana durumu açıkla
            main_explanation = self._generate_main_explanation(summary)
            
            # Basit soru-cevaplar oluştur
            auto_qa = self._generate_automatic_qa(summary, insights, actions)
            
            # Kullanıcı dostu özet
            friendly_summary = self._create_friendly_summary(summary, insights)
            
            # Önemli notlar
            important_notes = self._extract_important_notes(actions)
            
            return {
                "main_explanation": main_explanation,
                "simple_summary": friendly_summary,
                "automatic_qa": auto_qa,
                "important_notes": important_notes,
                "status_indicator": self._get_status_indicator(summary),
                "next_steps": self._suggest_next_steps(summary),
                "user_friendly_data": {
                    "total_threats": summary.get("total_threats_analyzed", 0),
                    "risk_level": self._translate_risk_level(summary.get("overall_risk_assessment", "ORTA")),
                    "confidence": f"%{int(summary.get('confidence_score', 0.5) * 100)}",
                    "analysis_time": self._format_friendly_time(datetime.now())
                }
            }
            
        except Exception as e:
            logger.error(f"Kullanıcı dostu açıklama hatası: {str(e)}")
            return self._create_fallback_explanation()
    
    def _generate_main_explanation(self, summary: Dict) -> str:
        """Ana durumu basit dilde açıkla"""
        total_threats = summary.get("total_threats_analyzed", 0)
        high_priority = summary.get("high_priority_threats", 0)
        risk_level = summary.get("overall_risk_assessment", "ORTA")
        
        if risk_level.upper() in ["DÜŞÜK", "LOW"]:
            if total_threats == 0:
                return "Şu anda herhangi bir tehdit tespit edilmedi. Sistem normal şekilde çalışmaya devam ediyor."
            else:
                return f"Toplam {total_threats} asteroit analiz edildi. Herhangi bir tehlike görünmüyor, durum güvenli."
        
        elif risk_level.upper() in ["ORTA", "MEDIUM"]:
            return f"Toplam {total_threats} asteroit analiz edildi. {high_priority} tanesi yakından izlenmeli ama acil bir tehlike yok."
        
        elif risk_level.upper() in ["YÜKSEK", "HIGH"]:
            return f"Dikkat: {total_threats} asteroit arasından {high_priority} tanesi yakından takip edilmeli. Sistem sürekli izliyor."
        
        else:
            return f"{total_threats} asteroit analiz edildi. Genel durum kontrol altında, izleme devam ediyor."
    
    def _generate_automatic_qa(self, summary: Dict, insights: List, actions: List) -> Dict[str, str]:
        """Kullanıcıların muhtemelen soracağı soruları otomatik yanıtla"""
        
        total_threats = summary.get("total_threats_analyzed", 0)
        high_priority = summary.get("high_priority_threats", 0)
        risk_level = summary.get("overall_risk_assessment", "ORTA")
        confidence = summary.get("confidence_score", 0.5)
        
        qa = {}
        
        # En sık sorulan sorular
        qa["Şu anda herhangi bir tehlike var mı?"] = self._answer_current_danger(risk_level, high_priority)
        qa["Kaç tane asteroit tespit edildi?"] = f"Toplam {total_threats} asteroit analiz edildi."
        qa["Bu sonuçlara ne kadar güvenebilirim?"] = f"Analiz güvenilirliği %{int(confidence * 100)}. Profesyonel NASA verileri kullanılıyor."
        qa["Ne yapmalıyım?"] = self._answer_what_to_do(risk_level, actions)
        qa["Nerede bu asteroitler?"] = "Çoğu Mars-Dünya arası bölgede bulunuyor. 3D görünümde konumlarını inceleyebilirsiniz."
        qa["Ne zaman yaklaşacaklar?"] = self._answer_when_approach(insights)
        qa["Güvenli miyim?"] = self._answer_safety(risk_level)
        
        return qa
    
    def _answer_current_danger(self, risk_level: str, high_priority: int) -> str:
        """Şu anda tehlike var mı sorusunu yanıtla"""
        risk_upper = risk_level.upper()
        
        if risk_upper in ["DÜŞÜK", "LOW"]:
            return "Hayır, şu anda herhangi bir acil tehlike bulunmuyor. Durum güvenli."
        elif risk_upper in ["ORTA", "MEDIUM"]:
            if high_priority > 0:
                return f"Acil tehlike yok ama {high_priority} asteroit yakından izlenmeli."
            else:
                return "Acil tehlike yok, normal izleme devam ediyor."
        else:
            return f"Dikkat gerekiyor: {high_priority} asteroit yakından takip ediliyor."
    
    def _answer_what_to_do(self, risk_level: str, actions: List) -> str:
        """Ne yapmalıyım sorusunu yanıtla"""
        risk_upper = risk_level.upper()
        
        if risk_upper in ["DÜŞÜK", "LOW"]:
            return "Şimdilik hiçbir şey yapmanıza gerek yok. Sistem otomatik izleme yapıyor."
        elif len(actions) > 0:
            # İlk aksiyon önerisini basitleştir
            first_action = actions[0]
            simplified = self._simplify_action(first_action)
            return f"Önerilen: {simplified}"
        else:
            return "Sistem otomatik izleme yapıyor. Güncelleme geldiğinde bildirilecek."
    
    def _answer_when_approach(self, insights: List) -> str:
        """Ne zaman yaklaşacak sorusunu yanıtla"""
        # Insights'larda tarih bilgisi ara
        for insight in insights[:3]:  # İlk 3'e bak
            if any(keyword in insight.lower() for keyword in ["kasım", "aralık", "ocak", "şubat", "mart", "2024", "2025"]):
                return "Yaklaşım tarihleri insights'larda belirtildi. Detaylar için analiz sonuçlarını inceleyin."
        
        return "Yaklaşım tarihleri sürekli hesaplanıyor. Önemli yaklaşımlarda otomatik bildirim alacaksınız."
    
    def _answer_safety(self, risk_level: str) -> str:
        """Güvenli miyim sorusunu yanıtla"""
        risk_upper = risk_level.upper()
        
        if risk_upper in ["DÜŞÜK", "LOW"]:
            return "Evet, tamamen güvendesiniz. Sistem sürekli kontrol ediyor."
        elif risk_upper in ["ORTA", "MEDIUM"]:
            return "Genel olarak güvendesiniz. Sistem dikkatli bir şekilde izliyor."
        else:
            return "Durum kontrol altında. Profesyonel izleme sistemleri aktif çalışıyor."
    
    def _create_friendly_summary(self, summary: Dict, insights: List) -> Dict[str, str]:
        """Teknik verileri sade dilde özetle"""
        return {
            "durum": self._translate_risk_level(summary.get("overall_risk_assessment", "ORTA")),
            "analiz_edilen": f"{summary.get('total_threats_analyzed', 0)} asteroit",
            "dikkat_gereken": f"{summary.get('high_priority_threats', 0)} adet",
            "güvenilirlik": f"%{int(summary.get('confidence_score', 0.5) * 100)}",
            "son_kontrol": "Az önce"
        }
    
    def _extract_important_notes(self, actions: List) -> List[str]:
        """Önemli notları çıkar ve basitleştir"""
        important = []
        
        for action in actions[:3]:  # İlk 3 aksiyon
            simplified = self._simplify_action(action)
            if simplified and len(simplified) > 10:
                important.append(simplified)
        
        if not important:
            important.append("Sistem otomatik izleme yapıyor")
            important.append("Önemli güncellemeler bildirilecek")
        
        return important
    
    def _simplify_action(self, action: str) -> str:
        """Teknik aksiyonu basit dile çevir"""
        action_lower = action.lower()
        
        # Yaygın terimleri değiştir
        replacements = {
            "yüksek riskli objelerin sürekli izlenmesi": "Riskli asteroitler takip edilmeli",
            "erken uyarı sistemlerinin aktif tutulması": "Uyarı sistemi aktif olmalı",
            "veri güncellemelerinin düzenli takibi": "Veriler düzenli kontrol edilmeli",
            "sistem performansını izleyin": "Sistem kontrolü yapın",
            "monitoring": "izleme",
            "assessment": "değerlendirme",
            "recommendation": "öneri"
        }
        
        simplified = action
        for old, new in replacements.items():
            simplified = simplified.replace(old, new)
        
        return simplified
    
    def _translate_risk_level(self, risk_level: str) -> str:
        """Risk seviyesini Türkçe'ye çevir"""
        translations = {
            "LOW": "Güvenli",
            "DÜŞÜK": "Güvenli", 
            "MEDIUM": "Normal",
            "ORTA": "Normal",
            "HIGH": "Dikkat",
            "YÜKSEK": "Dikkat",
            "CRITICAL": "Önemli"
        }
        
        return translations.get(risk_level.upper(), "Normal")
    
    def _get_status_indicator(self, summary: Dict) -> Dict[str, str]:
        """Durum göstergesi oluştur"""
        risk_level = summary.get("overall_risk_assessment", "ORTA").upper()
        
        indicators = {
            "LOW": {"color": "green", "icon": "✅", "text": "Güvenli"},
            "DÜŞÜK": {"color": "green", "icon": "✅", "text": "Güvenli"},
            "MEDIUM": {"color": "yellow", "icon": "⚠️", "text": "Normal"},
            "ORTA": {"color": "yellow", "icon": "⚠️", "text": "Normal"},
            "HIGH": {"color": "orange", "icon": "🔶", "text": "Dikkat"},
            "YÜKSEK": {"color": "orange", "icon": "🔶", "text": "Dikkat"},
            "CRITICAL": {"color": "red", "icon": "🔴", "text": "Önemli"}
        }
        
        return indicators.get(risk_level, indicators["ORTA"])
    
    def _suggest_next_steps(self, summary: Dict) -> List[str]:
        """Sonraki adımları öner"""
        risk_level = summary.get("overall_risk_assessment", "ORTA").upper()
        high_priority = summary.get("high_priority_threats", 0)
        
        if risk_level in ["LOW", "DÜŞÜK"]:
            return [
                "Sistemi otomatik izleme modunda bırakın",
                "Önemli güncellemeleri bekleyin"
            ]
        elif risk_level in ["MEDIUM", "ORTA"]:
            steps = ["Düzenli kontrol edin"]
            if high_priority > 0:
                steps.append(f"{high_priority} asteroiti yakından takip edin")
            return steps
        else:
            return [
                "Sistem güncellemelerini düzenli kontrol edin",
                "Kritik bildirimler için hazır olun"
            ]
    
    def _format_friendly_time(self, dt: datetime) -> str:
        """Zamanı kullanıcı dostu formatta göster"""
        now = datetime.now()
        diff = now - dt
        
        if diff.seconds < 60:
            return "Az önce"
        elif diff.seconds < 3600:
            mins = diff.seconds // 60
            return f"{mins} dakika önce"
        else:
            return dt.strftime("%d.%m.%Y %H:%M")
    
    def _create_fallback_explanation(self) -> Dict[str, Any]:
        """Hata durumunda basit açıklama"""
        return {
            "main_explanation": "Sistem analiz yapıyor. Sonuçlar hazır olduğunda gösterilecek.",
            "simple_summary": {
                "durum": "Analiz devam ediyor",
                "analiz_edilen": "Hesaplanıyor",
                "güvenilirlik": "Hazırlanıyor",
                "son_kontrol": "Şimdi"
            },
            "automatic_qa": {
                "Sistem çalışıyor mu?": "Evet, analiz devam ediyor.",
                "Ne kadar sürer?": "Birkaç dakika içinde tamamlanacak."
            },
            "important_notes": [
                "Analiz devam ediyor",
                "Sonuçlar otomatik güncellenecek"
            ],
            "status_indicator": {"color": "blue", "icon": "🔄", "text": "Analiz yapılıyor"},
            "next_steps": ["Analiz tamamlanmasını bekleyin"]
        }


# Singleton instance
user_friendly_explainer = UserFriendlyAIExplainer()

def get_user_friendly_explainer() -> UserFriendlyAIExplainer:
    """UserFriendlyAIExplainer instance'ını al"""
    return user_friendly_explainer