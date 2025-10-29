"""
🔗 Threat Correlation Engine - Tehdit Korelasyon Motoru
Multi-dimensional threat correlation with AI-powered pattern detection
"""

import asyncio
import math
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, field
from enum import Enum
import structlog

import math
import statistics

# Internal imports
from .intelligent_threat_processor import ThreatAnalysisResult, ThreatType, intelligent_threat_processor
from .realtime_priority_engine import PriorityScore, realtime_priority_engine
from .dynamic_risk_calculator import RiskAssessment, dynamic_risk_calculator
from .unified_ai_service import unified_ai_service, UnifiedChatRequest
from ..core.config import settings

# Setup logging
logger = structlog.get_logger(__name__)

# Scientific computing imports with fallbacks
try:
    import numpy as np
    numpy_available = True
except ImportError:
    logger.warning("NumPy not available, using fallback math operations")
    np = None
    numpy_available = False

try:
    from sklearn.cluster import DBSCAN, SpectralClustering
    from sklearn.metrics.pairwise import cosine_similarity
    sklearn_available = True
except ImportError:
    logger.warning("Scikit-learn not available, using simplified clustering")
    sklearn_available = False
    DBSCAN = None
    SpectralClustering = None
    cosine_similarity = None

try:
    import networkx as nx
    networkx_available = True
except ImportError:
    logger.warning("NetworkX not available, simplified network analysis")
    nx = None
    networkx_available = False


class CorrelationType(str, Enum):
    """Korelasyon türleri"""
    SPATIAL = "spatial"              # Uzaysal korelasyon
    TEMPORAL = "temporal"            # Zamansal korelasyon
    CAUSAL = "causal"               # Nedensel ilişki
    SIMILARITY = "similarity"       # Benzerlik korelasyonu
    COMPOUND = "compound"           # Bileşik risk
    PATTERN = "pattern"             # AI tespit ettiği pattern


class CorrelationStrength(str, Enum):
    """Korelasyon gücü"""
    VERY_WEAK = "very_weak"         # 0.0-0.2
    WEAK = "weak"                   # 0.2-0.4
    MODERATE = "moderate"           # 0.4-0.6
    STRONG = "strong"               # 0.6-0.8
    VERY_STRONG = "very_strong"     # 0.8-1.0


class CausalDirection(str, Enum):
    """Nedensel yön"""
    UNIDIRECTIONAL = "unidirectional"  # A -> B
    BIDIRECTIONAL = "bidirectional"    # A <-> B
    UNKNOWN = "unknown"                 # İlişki var ama yön belirsiz


@dataclass
class ThreatCorrelation:
    """İki tehdit arasındaki korelasyon"""
    threat_1_id: str
    threat_2_id: str
    correlation_type: CorrelationType
    correlation_strength: CorrelationStrength
    correlation_score: float  # 0.0-1.0
    
    # Spatial correlation attributes
    spatial_distance_km: Optional[float] = None
    geographic_overlap: Optional[float] = None
    
    # Temporal correlation attributes
    time_overlap_hours: Optional[float] = None
    temporal_lag_hours: Optional[float] = None
    
    # Causal relationship
    causal_direction: Optional[CausalDirection] = None
    causal_confidence: Optional[float] = None
    
    # Pattern correlation
    shared_characteristics: List[str] = field(default_factory=list)
    pattern_confidence: Optional[float] = None
    
    # Metadata
    correlation_timestamp: datetime = field(default_factory=datetime.now)
    expires_at: datetime = field(default_factory=lambda: datetime.now() + timedelta(hours=6))
    confidence_score: float = 0.5
    
    def is_expired(self) -> bool:
        """Korelasyon süresi dolmuş mu?"""
        return datetime.now() > self.expires_at
    
    def is_significant(self, threshold: float = 0.4) -> bool:
        """Anlamlı korelasyon mu?"""
        return self.correlation_score >= threshold


@dataclass
class ThreatCluster:
    """İlişkili tehditler kümesi"""
    cluster_id: str
    threat_ids: Set[str]
    cluster_center: Dict[str, float]  # Küme merkezi özellikleri
    
    # Cluster characteristics
    dominant_threat_type: ThreatType
    geographic_region: Optional[str] = None
    time_window: Optional[Tuple[datetime, datetime]] = None
    
    # Risk assessment
    compound_risk_score: float = 0.0
    amplification_factor: float = 1.0  # Risk artırım faktörü
    
    # Metadata
    created_at: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)
    stability_score: float = 0.5  # Kümenin kararlılığı
    
    def size(self) -> int:
        """Küme boyutu"""
        return len(self.threat_ids)
    
    def add_threat(self, threat_id: str):
        """Kümeye tehdit ekle"""
        self.threat_ids.add(threat_id)
        self.last_updated = datetime.now()


@dataclass
class CorrelationAnalysis:
    """Kapsamlı korelasyon analizi sonucu"""
    analysis_timestamp: datetime
    total_threats_analyzed: int
    
    # Correlation results
    significant_correlations: List[ThreatCorrelation]
    threat_clusters: List[ThreatCluster]
    correlation_network: Optional[Dict[str, Any]] = None
    
    # Spatial analysis
    spatial_hotspots: List[Dict[str, Any]] = field(default_factory=list)
    geographic_correlations: List[ThreatCorrelation] = field(default_factory=list)
    
    # Temporal analysis
    temporal_patterns: List[Dict[str, Any]] = field(default_factory=list)
    cascade_sequences: List[List[str]] = field(default_factory=list)
    
    # AI insights
    ai_detected_patterns: List[Dict[str, Any]] = field(default_factory=list)
    hidden_relationships: List[Dict[str, Any]] = field(default_factory=list)
    
    # Risk implications
    compound_risk_areas: List[Dict[str, Any]] = field(default_factory=list)
    risk_amplification_zones: List[Dict[str, Any]] = field(default_factory=list)
    
    # Confidence metrics
    overall_confidence: float = 0.5
    analysis_quality: str = "medium"  # poor, fair, good, excellent
    
    def get_summary(self) -> Dict[str, Any]:
        """Analiz özeti"""
        return {
            'total_threats': self.total_threats_analyzed,
            'significant_correlations': len(self.significant_correlations),
            'threat_clusters': len(self.threat_clusters),
            'spatial_hotspots': len(self.spatial_hotspots),
            'temporal_patterns': len(self.temporal_patterns),
            'ai_patterns': len(self.ai_detected_patterns),
            'compound_risks': len(self.compound_risk_areas),
            'overall_confidence': self.overall_confidence
        }


class SpatialAnalyzer:
    """Uzaysal analiz motoru"""
    
    def __init__(self):
        self.earth_radius_km = 6371.0
    
    def analyze_spatial_correlations(self, threats: List[Dict]) -> List[ThreatCorrelation]:
        """Uzaysal korelasyonları analiz et"""
        correlations = []
        
        try:
            # Extract threats with valid coordinates
            spatial_threats = []
            for threat in threats:
                coords = threat.get('coordinates')
                if coords and 'lat' in coords and 'lng' in coords:
                    spatial_threats.append(threat)
            
            if len(spatial_threats) < 2:
                return correlations
            
            # Pairwise spatial analysis
            for i, threat1 in enumerate(spatial_threats):
                for threat2 in spatial_threats[i+1:]:
                    correlation = self._calculate_spatial_correlation(threat1, threat2)
                    if correlation and correlation.is_significant():
                        correlations.append(correlation)
            
            logger.info(f"Spatial analysis completed: {len(correlations)} significant correlations found")
            return correlations
            
        except Exception as e:
            logger.error(f"Spatial analysis error: {str(e)}")
            return []
    
    def _calculate_spatial_correlation(self, threat1: Dict, threat2: Dict) -> Optional[ThreatCorrelation]:
        """İki tehdit arasındaki uzaysal korelasyon"""
        try:
            coords1 = threat1.get('coordinates', {})
            coords2 = threat2.get('coordinates', {})
            
            lat1, lng1 = coords1.get('lat', 0), coords1.get('lng', 0)
            lat2, lng2 = coords2.get('lat', 0), coords2.get('lng', 0)
            
            # Haversine distance
            distance_km = self._haversine_distance(lat1, lng1, lat2, lng2)
            
            # Spatial correlation based on distance
            if distance_km < 100:  # Very close
                correlation_score = 0.9
                strength = CorrelationStrength.VERY_STRONG
            elif distance_km < 500:  # Close
                correlation_score = 0.7
                strength = CorrelationStrength.STRONG
            elif distance_km < 1000:  # Moderate distance
                correlation_score = 0.5
                strength = CorrelationStrength.MODERATE
            elif distance_km < 5000:  # Far but potentially related
                correlation_score = 0.3
                strength = CorrelationStrength.WEAK
            else:  # Very far
                correlation_score = 0.1
                strength = CorrelationStrength.VERY_WEAK
            
            # Calculate geographic overlap (for area-based threats)
            geographic_overlap = self._calculate_geographic_overlap(threat1, threat2)
            
            return ThreatCorrelation(
                threat_1_id=threat1.get('threat_id', 'unknown1'),
                threat_2_id=threat2.get('threat_id', 'unknown2'),
                correlation_type=CorrelationType.SPATIAL,
                correlation_strength=strength,
                correlation_score=correlation_score,
                spatial_distance_km=distance_km,
                geographic_overlap=geographic_overlap,
                confidence_score=0.8  # Spatial calculations are usually reliable
            )
            
        except Exception as e:
            logger.error(f"Spatial correlation calculation error: {str(e)}")
            return None
    
    def _haversine_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Haversine mesafe hesaplama"""
        # Convert to radians
        lat1_r = math.radians(lat1)
        lng1_r = math.radians(lng1)
        lat2_r = math.radians(lat2)
        lng2_r = math.radians(lng2)
        
        # Haversine formula
        dlat = lat2_r - lat1_r
        dlng = lng2_r - lng1_r
        
        a = math.sin(dlat/2)**2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlng/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return self.earth_radius_km * c
    
    def _calculate_geographic_overlap(self, threat1: Dict, threat2: Dict) -> Optional[float]:
        """Coğrafi örtüşme hesaplama"""
        # Simplified overlap calculation - gerçek uygulamada daha karmaşık geometrik hesaplamalar
        
        # Check if threats have radius/area information
        radius1 = threat1.get('affected_radius_km', 0)
        radius2 = threat2.get('affected_radius_km', 0)
        
        if radius1 == 0 or radius2 == 0:
            return None
        
        coords1 = threat1.get('coordinates', {})
        coords2 = threat2.get('coordinates', {})
        
        distance = self._haversine_distance(
            coords1.get('lat', 0), coords1.get('lng', 0),
            coords2.get('lat', 0), coords2.get('lng', 0)
        )
        
        # Simple circular overlap calculation
        if distance >= (radius1 + radius2):
            return 0.0  # No overlap
        elif distance <= abs(radius1 - radius2):
            # One circle inside another
            smaller_radius = min(radius1, radius2)
            larger_radius = max(radius1, radius2)
            return (smaller_radius ** 2) / (larger_radius ** 2)
        else:
            # Partial overlap - simplified calculation
            overlap_ratio = 1.0 - (distance / (radius1 + radius2))
            return max(0.0, min(1.0, overlap_ratio))
    
    def identify_spatial_hotspots(self, threats: List[Dict]) -> List[Dict[str, Any]]:
        """Uzaysal hotspot'ları tespit et"""
        hotspots = []
        
        try:
            # Extract threats with coordinates
            spatial_threats = [
                t for t in threats 
                if t.get('coordinates') and 'lat' in t['coordinates'] and 'lng' in t['coordinates']
            ]
            
            if len(spatial_threats) < 3:
                return hotspots
            
            # Clustering approach
            coordinates = [
                [t['coordinates']['lat'], t['coordinates']['lng']]
                for t in spatial_threats
            ]
            
            if sklearn_available:
                try:
                    clustering = DBSCAN(eps=5.0, min_samples=2, metric='haversine')
                    clusters = clustering.fit_predict(coordinates)
                except Exception as e:
                    logger.warning(f"DBSCAN clustering failed: {e}, using simple clustering")
                    clusters = self._simple_geographic_clustering(coordinates)
            else:
                # Simple clustering based on distance
                clusters = self._simple_geographic_clustering(coordinates)
            
            # Process clusters
            unique_clusters = set(clusters)
            unique_clusters.discard(-1)  # Remove noise points
            
            for cluster_id in unique_clusters:
                cluster_threats = [
                    spatial_threats[i] for i, c in enumerate(clusters) if c == cluster_id
                ]
                
                if len(cluster_threats) >= 2:
                    # Calculate cluster center
                    lats = [t['coordinates']['lat'] for t in cluster_threats]
                    lngs = [t['coordinates']['lng'] for t in cluster_threats]
                    center_lat = statistics.mean(lats)
                    center_lng = statistics.mean(lngs)
                    
                    # Calculate cluster severity
                    severities = [self._get_numeric_severity(t.get('severity', 'MEDIUM')) for t in cluster_threats]
                    avg_severity = statistics.mean(severities)
                    
                    hotspot = {
                        'hotspot_id': f"hotspot_{cluster_id}",
                        'center_coordinates': {'lat': center_lat, 'lng': center_lng},
                        'threat_count': len(cluster_threats),
                        'threat_ids': [t.get('threat_id', 'unknown') for t in cluster_threats],
                        'average_severity': avg_severity,
                        'hotspot_radius_km': self._calculate_cluster_radius(cluster_threats),
                        'dominant_threat_types': self._get_dominant_types(cluster_threats)
                    }
                    
                    hotspots.append(hotspot)
            
            logger.info(f"Spatial hotspot detection completed: {len(hotspots)} hotspots found")
            return hotspots
            
        except Exception as e:
            logger.error(f"Spatial hotspot detection error: {str(e)}")
            return []
    
    def _get_numeric_severity(self, severity: str) -> float:
        """Severity'yi sayıya çevir"""
        severity_map = {
            'LOW': 0.25, 'DÜŞÜK': 0.25,
            'MEDIUM': 0.5, 'ORTA': 0.5,
            'HIGH': 0.75, 'YÜKSEK': 0.75,
            'CRITICAL': 1.0, 'KRİTİK': 1.0
        }
        return severity_map.get(severity.upper(), 0.5)
    
    def _calculate_cluster_radius(self, cluster_threats: List[Dict]) -> float:
        """Küme yarıçapı hesapla"""
        if len(cluster_threats) < 2:
            return 0.0
        
        # Calculate center coordinates
        lats = [t['coordinates']['lat'] for t in cluster_threats]
        lngs = [t['coordinates']['lng'] for t in cluster_threats]
        
        if numpy_available:
            center_lat = np.mean(lats)
            center_lng = np.mean(lngs)
        else:
            center_lat = statistics.mean(lats)
            center_lng = statistics.mean(lngs)
        
        max_distance = 0.0
        for threat in cluster_threats:
            distance = self._haversine_distance(
                center_lat, center_lng,
                threat['coordinates']['lat'], threat['coordinates']['lng']
            )
            max_distance = max(max_distance, distance)
        
        return max_distance
    
    def _get_dominant_types(self, threats: List[Dict]) -> List[str]:
        """Dominant tehdit türlerini bul"""
        type_counts = {}
        for threat in threats:
            threat_type = threat.get('threat_type', 'unknown')
            type_counts[threat_type] = type_counts.get(threat_type, 0) + 1
        
        # Sort by count
        sorted_types = sorted(type_counts.items(), key=lambda x: x[1], reverse=True)
        return [t[0] for t in sorted_types[:3]]  # Top 3 types
    
    def _simple_geographic_clustering(self, coordinates: List[List[float]]) -> List[int]:
        """Simple distance-based geographic clustering fallback"""
        if len(coordinates) < 2:
            return [0] * len(coordinates)
        
        clusters = [-1] * len(coordinates)
        current_cluster = 0
        distance_threshold = 1000  # 1000 km threshold
        
        for i, coord1 in enumerate(coordinates):
            if clusters[i] != -1:
                continue
                
            # Start new cluster
            clusters[i] = current_cluster
            cluster_members = [i]
            
            # Find nearby points
            for j, coord2 in enumerate(coordinates[i+1:], i+1):
                if clusters[j] != -1:
                    continue
                    
                # Calculate distance
                distance = self._haversine_distance(coord1[0], coord1[1], coord2[0], coord2[1])
                if distance < distance_threshold:
                    clusters[j] = current_cluster
                    cluster_members.append(j)
            
            if len(cluster_members) > 1:
                current_cluster += 1
        
        return clusters


class TemporalAnalyzer:
    """Zamansal analiz motoru"""
    
    def __init__(self):
        self.time_window_hours = 168  # 1 week default
    
    def analyze_temporal_correlations(self, threats: List[Dict]) -> List[ThreatCorrelation]:
        """Zamansal korelasyonları analiz et"""
        correlations = []
        
        try:
            # Extract threats with timestamps
            temporal_threats = []
            for threat in threats:
                timestamp_str = threat.get('time_to_impact') or threat.get('created_at')
                if timestamp_str:
                    timestamp = self._parse_timestamp(timestamp_str)
                    if timestamp:
                        threat['parsed_timestamp'] = timestamp
                        temporal_threats.append(threat)
            
            if len(temporal_threats) < 2:
                return correlations
            
            # Sort by time
            temporal_threats.sort(key=lambda x: x['parsed_timestamp'])
            
            # Pairwise temporal analysis
            for i, threat1 in enumerate(temporal_threats):
                for threat2 in temporal_threats[i+1:]:
                    correlation = self._calculate_temporal_correlation(threat1, threat2)
                    if correlation and correlation.is_significant():
                        correlations.append(correlation)
            
            logger.info(f"Temporal analysis completed: {len(correlations)} significant correlations found")
            return correlations
            
        except Exception as e:
            logger.error(f"Temporal analysis error: {str(e)}")
            return []
    
    def _calculate_temporal_correlation(self, threat1: Dict, threat2: Dict) -> Optional[ThreatCorrelation]:
        """İki tehdit arasındaki zamansal korelasyon"""
        try:
            time1 = threat1['parsed_timestamp']
            time2 = threat2['parsed_timestamp']
            
            # Time difference
            time_diff = abs((time2 - time1).total_seconds() / 3600)  # hours
            
            # Temporal correlation based on time proximity
            if time_diff < 1:  # Within 1 hour
                correlation_score = 0.9
                strength = CorrelationStrength.VERY_STRONG
            elif time_diff < 6:  # Within 6 hours
                correlation_score = 0.7
                strength = CorrelationStrength.STRONG
            elif time_diff < 24:  # Within 1 day
                correlation_score = 0.5
                strength = CorrelationStrength.MODERATE
            elif time_diff < 72:  # Within 3 days
                correlation_score = 0.3
                strength = CorrelationStrength.WEAK
            else:  # More than 3 days
                correlation_score = 0.1
                strength = CorrelationStrength.VERY_WEAK
            
            # Calculate overlap duration for ongoing threats
            overlap_hours = self._calculate_temporal_overlap(threat1, threat2)
            
            # Temporal lag (for potential causality)
            temporal_lag = (time2 - time1).total_seconds() / 3600
            
            return ThreatCorrelation(
                threat_1_id=threat1.get('threat_id', 'unknown1'),
                threat_2_id=threat2.get('threat_id', 'unknown2'),
                correlation_type=CorrelationType.TEMPORAL,
                correlation_strength=strength,
                correlation_score=correlation_score,
                time_overlap_hours=overlap_hours,
                temporal_lag_hours=temporal_lag,
                confidence_score=0.7
            )
            
        except Exception as e:
            logger.error(f"Temporal correlation calculation error: {str(e)}")
            return None
    
    def _parse_timestamp(self, timestamp_str: str) -> Optional[datetime]:
        """Timestamp string'ini parse et"""
        try:
            # Try ISO format
            if 'T' in timestamp_str:
                return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00')).replace(tzinfo=None)
            else:
                return datetime.strptime(timestamp_str, '%Y-%m-%d')
        except Exception:
            return None
    
    def _calculate_temporal_overlap(self, threat1: Dict, threat2: Dict) -> Optional[float]:
        """Zamansal örtüşme hesapla"""
        try:
            # Get start and end times for each threat
            start1 = threat1['parsed_timestamp']
            start2 = threat2['parsed_timestamp']
            
            # Estimate end times (simplified - could be more sophisticated)
            duration1 = threat1.get('duration_hours', 24)  # Default 24 hours
            duration2 = threat2.get('duration_hours', 24)
            
            end1 = start1 + timedelta(hours=duration1)
            end2 = start2 + timedelta(hours=duration2)
            
            # Calculate overlap
            latest_start = max(start1, start2)
            earliest_end = min(end1, end2)
            
            if latest_start < earliest_end:
                overlap = (earliest_end - latest_start).total_seconds() / 3600
                return overlap
            else:
                return 0.0
                
        except Exception:
            return None
    
    def identify_cascade_sequences(self, threats: List[Dict]) -> List[List[str]]:
        """Cascade sekanslarını tespit et"""
        sequences = []
        
        try:
            # Extract and sort temporal threats
            temporal_threats = []
            for threat in threats:
                timestamp_str = threat.get('time_to_impact') or threat.get('created_at')
                if timestamp_str:
                    timestamp = self._parse_timestamp(timestamp_str)
                    if timestamp:
                        threat['parsed_timestamp'] = timestamp
                        temporal_threats.append(threat)
            
            temporal_threats.sort(key=lambda x: x['parsed_timestamp'])
            
            # Look for potential cascade patterns
            current_sequence = []
            cascade_threshold_hours = 72  # 3 days
            
            for i, threat in enumerate(temporal_threats):
                if not current_sequence:
                    current_sequence = [threat['threat_id']]
                else:
                    # Check if this threat could be part of cascade
                    last_threat_time = temporal_threats[i-1]['parsed_timestamp']
                    current_threat_time = threat['parsed_timestamp']
                    
                    time_diff = (current_threat_time - last_threat_time).total_seconds() / 3600
                    
                    if time_diff <= cascade_threshold_hours:
                        # Potential cascade continuation
                        severity1 = self._get_numeric_severity(temporal_threats[i-1].get('severity', 'MEDIUM'))
                        severity2 = self._get_numeric_severity(threat.get('severity', 'MEDIUM'))
                        
                        # Check if severity is increasing or similar threat types
                        if (severity2 >= severity1 * 0.8 or 
                            threat.get('threat_type') == temporal_threats[i-1].get('threat_type')):
                            current_sequence.append(threat['threat_id'])
                        else:
                            # End current sequence, start new one
                            if len(current_sequence) >= 3:
                                sequences.append(current_sequence.copy())
                            current_sequence = [threat['threat_id']]
                    else:
                        # Time gap too large, end sequence
                        if len(current_sequence) >= 3:
                            sequences.append(current_sequence.copy())
                        current_sequence = [threat['threat_id']]
            
            # Add final sequence if significant
            if len(current_sequence) >= 3:
                sequences.append(current_sequence)
            
            logger.info(f"Cascade sequence detection completed: {len(sequences)} sequences found")
            return sequences
            
        except Exception as e:
            logger.error(f"Cascade sequence detection error: {str(e)}")
            return []
    
    def _get_numeric_severity(self, severity: str) -> float:
        """Severity'yi sayıya çevir"""
        severity_map = {
            'LOW': 0.25, 'DÜŞÜK': 0.25,
            'MEDIUM': 0.5, 'ORTA': 0.5,
            'HIGH': 0.75, 'YÜKSEK': 0.75,
            'CRITICAL': 1.0, 'KRİTİK': 1.0
        }
        return severity_map.get(severity.upper(), 0.5)


class ThreatCorrelationEngine:
    """
    🔗 Ana tehdit korelasyon motoru
    """
    
    def __init__(self):
        self.ai_service = unified_ai_service
        self.threat_processor = intelligent_threat_processor
        self.priority_engine = realtime_priority_engine
        self.risk_calculator = dynamic_risk_calculator
        
        # Analysis components
        self.spatial_analyzer = SpatialAnalyzer()
        self.temporal_analyzer = TemporalAnalyzer()
        
        # Caching and performance
        self.correlation_cache = {}
        self.cache_ttl = 3600  # 1 hour
        
        logger.info("Threat Correlation Engine initialized")
    
    async def analyze_threat_correlations(self, threats: List[Dict]) -> CorrelationAnalysis:
        """
        🎯 Kapsamlı tehdit korelasyon analizi
        """
        analysis_start = datetime.now()
        
        logger.info(f"Starting correlation analysis for {len(threats)} threats")
        
        try:
            # 1. Paralel correlation analysis
            correlation_tasks = [
                self._analyze_spatial_correlations(threats),
                self._analyze_temporal_correlations(threats),
                self._identify_causal_relationships(threats),
                self._perform_similarity_analysis(threats)
            ]
            
            results = await asyncio.gather(*correlation_tasks, return_exceptions=True)
            
            # Handle results
            spatial_correlations = self._handle_correlation_result(results[0], 'spatial')
            temporal_correlations = self._handle_correlation_result(results[1], 'temporal')
            causal_relationships = self._handle_correlation_result(results[2], 'causal')
            similarity_correlations = self._handle_correlation_result(results[3], 'similarity')
            
            # 2. Combine all significant correlations
            all_correlations = []
            all_correlations.extend(spatial_correlations)
            all_correlations.extend(temporal_correlations)
            all_correlations.extend(causal_relationships)
            all_correlations.extend(similarity_correlations)
            
            significant_correlations = [c for c in all_correlations if c.is_significant()]
            
            # 3. Clustering analysis
            threat_clusters = await self._perform_threat_clustering(threats, significant_correlations)
            
            # 4. AI pattern detection
            ai_patterns = await self._ai_pattern_detection(threats, significant_correlations)
            
            # 5. Network analysis
            correlation_network = self._build_correlation_network(significant_correlations)
            
            # 6. Spatial hotspots
            spatial_hotspots = self.spatial_analyzer.identify_spatial_hotspots(threats)
            
            # 7. Cascade sequences
            cascade_sequences = self.temporal_analyzer.identify_cascade_sequences(threats)
            
            # 8. Risk implications
            compound_risks, amplification_zones = await self._assess_risk_implications(
                threats, significant_correlations, threat_clusters
            )
            
            # 9. Overall confidence assessment
            overall_confidence = self._calculate_overall_confidence(
                len(threats), len(significant_correlations), ai_patterns
            )
            
            # 10. Create comprehensive analysis
            analysis = CorrelationAnalysis(
                analysis_timestamp=analysis_start,
                total_threats_analyzed=len(threats),
                significant_correlations=significant_correlations,
                threat_clusters=threat_clusters,
                correlation_network=correlation_network,
                spatial_hotspots=spatial_hotspots,
                geographic_correlations=[c for c in significant_correlations if c.correlation_type == CorrelationType.SPATIAL],
                temporal_patterns=[{
                    'pattern_type': 'cascade_sequence',
                    'sequences': cascade_sequences
                }],
                cascade_sequences=cascade_sequences,
                ai_detected_patterns=ai_patterns.get('patterns', []),
                hidden_relationships=ai_patterns.get('hidden_relationships', []),
                compound_risk_areas=compound_risks,
                risk_amplification_zones=amplification_zones,
                overall_confidence=overall_confidence,
                analysis_quality=self._assess_analysis_quality(overall_confidence, len(significant_correlations))
            )
            
            processing_time = (datetime.now() - analysis_start).total_seconds()
            logger.info(f"Correlation analysis completed in {processing_time:.2f}s")
            logger.info(f"Analysis summary: {analysis.get_summary()}")
            
            return analysis
            
        except Exception as e:
            logger.error(f"Correlation analysis error: {str(e)}")
            return self._create_fallback_analysis(threats, analysis_start)
    
    async def _analyze_spatial_correlations(self, threats: List[Dict]) -> List[ThreatCorrelation]:
        """Uzaysal korelasyon analizi"""
        return self.spatial_analyzer.analyze_spatial_correlations(threats)
    
    async def _analyze_temporal_correlations(self, threats: List[Dict]) -> List[ThreatCorrelation]:
        """Zamansal korelasyon analizi"""
        return self.temporal_analyzer.analyze_temporal_correlations(threats)
    
    async def _identify_causal_relationships(self, threats: List[Dict]) -> List[ThreatCorrelation]:
        """Nedensel ilişkileri tespit et"""
        causal_correlations = []
        
        try:
            # Simple causal relationship detection based on threat types and timing
            threat_pairs = [(threats[i], threats[j]) for i in range(len(threats)) for j in range(i+1, len(threats))]
            
            for threat1, threat2 in threat_pairs:
                causal_correlation = self._assess_causality(threat1, threat2)
                if causal_correlation and causal_correlation.causal_confidence > 0.5:
                    causal_correlations.append(causal_correlation)
            
            logger.info(f"Causal analysis completed: {len(causal_correlations)} relationships found")
            return causal_correlations
            
        except Exception as e:
            logger.error(f"Causal relationship analysis error: {str(e)}")
            return []
    
    def _assess_causality(self, threat1: Dict, threat2: Dict) -> Optional[ThreatCorrelation]:
        """İki tehdit arasındaki nedensellik değerlendirmesi"""
        try:
            type1 = threat1.get('threat_type', 'unknown')
            type2 = threat2.get('threat_type', 'unknown')
            
            # Known causal relationships
            causal_rules = {
                ('space_weather', 'communication_disruption'): (0.8, CausalDirection.UNIDIRECTIONAL),
                ('earth_event', 'infrastructure_damage'): (0.7, CausalDirection.UNIDIRECTIONAL),
                ('asteroid', 'earth_event'): (0.9, CausalDirection.UNIDIRECTIONAL),
                ('solar_flare', 'geomagnetic_storm'): (0.85, CausalDirection.UNIDIRECTIONAL)
            }
            
            # Check both directions
            forward_rule = causal_rules.get((type1, type2))
            reverse_rule = causal_rules.get((type2, type1))
            
            if forward_rule:
                confidence, direction = forward_rule
                correlation_score = confidence
                causal_dir = direction
            elif reverse_rule:
                confidence, direction = reverse_rule
                correlation_score = confidence
                # Reverse the threats for consistent direction
                causal_dir = direction
                threat1, threat2 = threat2, threat1
            else:
                # No known causal relationship
                return None
            
            return ThreatCorrelation(
                threat_1_id=threat1.get('threat_id', 'unknown1'),
                threat_2_id=threat2.get('threat_id', 'unknown2'),
                correlation_type=CorrelationType.CAUSAL,
                correlation_strength=self._score_to_strength(correlation_score),
                correlation_score=correlation_score,
                causal_direction=causal_dir,
                causal_confidence=confidence,
                confidence_score=confidence
            )
            
        except Exception as e:
            logger.error(f"Causality assessment error: {str(e)}")
            return None
    
    async def _perform_similarity_analysis(self, threats: List[Dict]) -> List[ThreatCorrelation]:
        """Benzerlik analizi"""
        similarity_correlations = []
        
        try:
            # Feature extraction for similarity
            features = []
            threat_ids = []
            
            for threat in threats:
                feature_vector = self._extract_feature_vector(threat)
                if feature_vector is not None:
                    features.append(feature_vector)
                    threat_ids.append(threat.get('threat_id', 'unknown'))
            
            if len(features) < 2:
                return similarity_correlations
            
            if sklearn_available and numpy_available:
                # Calculate pairwise similarities using sklearn
                features_array = np.array(features)
                similarity_matrix = cosine_similarity(features_array)
                
                # Extract significant similarities
                for i in range(len(features)):
                    for j in range(i+1, len(features)):
                        similarity_score = similarity_matrix[i][j]
                        
                        if similarity_score > 0.4:  # Threshold for significance
                            correlation = ThreatCorrelation(
                                threat_1_id=threat_ids[i],
                                threat_2_id=threat_ids[j],
                                correlation_type=CorrelationType.SIMILARITY,
                                correlation_strength=self._score_to_strength(similarity_score),
                                correlation_score=similarity_score,
                                shared_characteristics=self._identify_shared_characteristics(threats[i], threats[j]),
                                pattern_confidence=similarity_score,
                                confidence_score=0.7
                            )
                            
                            similarity_correlations.append(correlation)
            else:
                # Fallback: Simple similarity calculation
                for i in range(len(features)):
                    for j in range(i+1, len(features)):
                        similarity_score = self._calculate_simple_similarity(features[i], features[j])
                        
                        if similarity_score > 0.4:
                            correlation = ThreatCorrelation(
                                threat_1_id=threat_ids[i],
                                threat_2_id=threat_ids[j],
                                correlation_type=CorrelationType.SIMILARITY,
                                correlation_strength=self._score_to_strength(similarity_score),
                                correlation_score=similarity_score,
                                shared_characteristics=self._identify_shared_characteristics(threats[i], threats[j]),
                                pattern_confidence=similarity_score,
                                confidence_score=0.6  # Lower confidence for fallback method
                            )
                            
                            similarity_correlations.append(correlation)
            
            logger.info(f"Similarity analysis completed: {len(similarity_correlations)} similarities found")
            return similarity_correlations
            
        except Exception as e:
            logger.error(f"Similarity analysis error: {str(e)}")
            return []
    
    def _extract_feature_vector(self, threat: Dict) -> Optional[list]:
        """Tehdit için özellik vektörü çıkar"""
        try:
            features = []
            
            # Threat type (one-hot encoded)
            threat_types = ['asteroid', 'earth_event', 'space_weather', 'orbital_debris', 'unknown']
            threat_type = threat.get('threat_type', 'unknown')
            type_vector = [1.0 if threat_type == t else 0.0 for t in threat_types]
            features.extend(type_vector)
            
            # Severity
            severity_score = self._get_numeric_severity(threat.get('severity', 'MEDIUM'))
            features.append(severity_score)
            
            # Impact probability
            features.append(threat.get('impact_probability', 0.1))
            
            # Confidence score
            features.append(threat.get('confidence_score', 0.5))
            
            # Time criticality (simplified)
            time_to_impact = threat.get('time_to_impact_hours', 720)  # Default 30 days
            time_criticality = max(0.0, 1.0 - (time_to_impact / 720))
            features.append(time_criticality)
            
            # Geographic factor (has coordinates?)
            has_coords = 1.0 if threat.get('coordinates') else 0.0
            features.append(has_coords)
            
            return features
            
        except Exception as e:
            logger.error(f"Feature extraction error: {str(e)}")
            return None
    
    def _identify_shared_characteristics(self, threat1: Dict, threat2: Dict) -> List[str]:
        """Ortak özellikleri tespit et"""
        shared = []
        
        # Same threat type
        if threat1.get('threat_type') == threat2.get('threat_type'):
            shared.append('same_threat_type')
        
        # Similar severity
        sev1 = self._get_numeric_severity(threat1.get('severity', 'MEDIUM'))
        sev2 = self._get_numeric_severity(threat2.get('severity', 'MEDIUM'))
        if abs(sev1 - sev2) < 0.2:
            shared.append('similar_severity')
        
        # Same data source
        if threat1.get('data_source') == threat2.get('data_source'):
            shared.append('same_data_source')
        
        # Similar impact probability
        prob1 = threat1.get('impact_probability', 0.1)
        prob2 = threat2.get('impact_probability', 0.1)
        if abs(prob1 - prob2) < 0.2:
            shared.append('similar_impact_probability')
        
        return shared
    
    async def _perform_threat_clustering(self, threats: List[Dict], correlations: List[ThreatCorrelation]) -> List[ThreatCluster]:
        """Tehdit kümeleme analizi"""
        clusters = []
        
        try:
            if len(threats) < 3:
                return clusters
            
            # Create adjacency matrix from correlations
            threat_ids = [t.get('threat_id', f'threat_{i}') for i, t in enumerate(threats)]
            threat_id_to_idx = {tid: i for i, tid in enumerate(threat_ids)}
            
            if numpy_available:
                # Build similarity matrix with numpy
                similarity_matrix = np.zeros((len(threats), len(threats)))
                
                for corr in correlations:
                    if corr.threat_1_id in threat_id_to_idx and corr.threat_2_id in threat_id_to_idx:
                        i = threat_id_to_idx[corr.threat_1_id]
                        j = threat_id_to_idx[corr.threat_2_id]
                        similarity_matrix[i][j] = corr.correlation_score
                        similarity_matrix[j][i] = corr.correlation_score
                
                # Apply clustering
                if sklearn_available and np.any(similarity_matrix > 0):
                    # Use spectral clustering on similarity matrix
                    clustering = SpectralClustering(n_clusters=min(5, len(threats)//2), affinity='precomputed')
                    cluster_labels = clustering.fit_predict(similarity_matrix)
                else:
                    # Simple clustering fallback
                    cluster_labels = self._simple_threat_clustering(threats, correlations)
            else:
                # Complete fallback without numpy
                cluster_labels = self._simple_threat_clustering(threats, correlations)
                
                # Process clusters
                unique_labels = set(cluster_labels)
                
                for cluster_id in unique_labels:
                    cluster_threat_indices = [i for i, label in enumerate(cluster_labels) if label == cluster_id]
                    
                    if len(cluster_threat_indices) >= 2:
                        cluster_threats = [threats[i] for i in cluster_threat_indices]
                        cluster_threat_ids = set(threat_ids[i] for i in cluster_threat_indices)
                        
                        # Calculate cluster characteristics
                        dominant_type = self._find_dominant_threat_type(cluster_threats)
                        
                        # Calculate compound risk
                        compound_risk = self._calculate_compound_risk(cluster_threats)
                        
                        cluster = ThreatCluster(
                            cluster_id=f"cluster_{cluster_id}",
                            threat_ids=cluster_threat_ids,
                            cluster_center=self._calculate_cluster_center(cluster_threats),
                            dominant_threat_type=ThreatType(dominant_type),
                            compound_risk_score=compound_risk,
                            amplification_factor=self._calculate_amplification_factor(len(cluster_threats)),
                            stability_score=0.7  # Default stability
                        )
                        
                        clusters.append(cluster)
            
            logger.info(f"Threat clustering completed: {len(clusters)} clusters found")
            return clusters
            
        except Exception as e:
            logger.error(f"Threat clustering error: {str(e)}")
            return []
    
    async def _ai_pattern_detection(self, threats: List[Dict], correlations: List[ThreatCorrelation]) -> Dict[str, Any]:
        """AI ile gizli pattern tespiti"""
        try:
            # Prepare summary for AI analysis
            threat_summary = self._prepare_threat_summary_for_ai(threats)
            correlation_summary = self._prepare_correlation_summary_for_ai(correlations)
            
            prompt = f"""
CLIFF Tehdit Pattern Analisti olarak, bu tehdit setindeki gizli bağlantıları ve pattern'leri analiz et:

TEHDITLER ({len(threats)} adet):
{threat_summary}

TESPIT EDİLEN KORELASYONLAR ({len(correlations)} adet):
{correlation_summary}

Lütfen şunları analiz et:
1. Görünmeyen bağlantılar ve pattern'ler
2. Domino etkisi potansiyeli 
3. Sinerjik risk faktörleri
4. Öncelik sıralaması önerileri
5. Erken uyarı göstergeleri

JSON formatında yanıt ver:
{{
    "hidden_patterns": [
        {{"pattern_type": "...", "description": "...", "confidence": 0.0-1.0}}
    ],
    "domino_effects": [
        {{"trigger": "threat_id", "cascade": ["threat_id1", "threat_id2"], "probability": 0.0-1.0}}
    ],
    "synergistic_risks": [
        {{"threat_combination": ["id1", "id2"], "amplified_risk": 0.0-1.0, "reason": "..."}}
    ],
    "priority_recommendations": [
        {{"threat_id": "...", "priority_adjustment": "increase/decrease", "reason": "..."}}
    ],
    "early_warning_indicators": ["indicator1", "indicator2"]
}}
"""
            
            request = UnifiedChatRequest(
                messages=[{"role": "user", "content": prompt}],
                model="gemini-2.5-pro",
                temperature=0.4,
                max_tokens=1500
            )
            
            response = await self.ai_service.chat_completion(request)
            
            if response.success and response.content:
                ai_analysis = self._parse_ai_pattern_response(response.content)
                
                return {
                    'patterns': ai_analysis.get('hidden_patterns', []),
                    'hidden_relationships': ai_analysis.get('domino_effects', []),
                    'synergistic_risks': ai_analysis.get('synergistic_risks', []),
                    'priority_recommendations': ai_analysis.get('priority_recommendations', []),
                    'early_warnings': ai_analysis.get('early_warning_indicators', []),
                    'ai_confidence': 0.7
                }
            else:
                return self._fallback_ai_patterns()
                
        except Exception as e:
            logger.error(f"AI pattern detection error: {str(e)}")
            return self._fallback_ai_patterns()
    
    # Helper methods
    def _handle_correlation_result(self, result: Any, correlation_type: str) -> List[ThreatCorrelation]:
        """Korelasyon sonucunu handle et"""
        if isinstance(result, Exception):
            logger.error(f"{correlation_type} correlation analysis failed: {str(result)}")
            return []
        elif isinstance(result, list):
            return result
        else:
            logger.warning(f"Unexpected {correlation_type} correlation result type: {type(result)}")
            return []
    
    def _score_to_strength(self, score: float) -> CorrelationStrength:
        """Skoru güç seviyesine çevir"""
        if score >= 0.8:
            return CorrelationStrength.VERY_STRONG
        elif score >= 0.6:
            return CorrelationStrength.STRONG
        elif score >= 0.4:
            return CorrelationStrength.MODERATE
        elif score >= 0.2:
            return CorrelationStrength.WEAK
        else:
            return CorrelationStrength.VERY_WEAK
    
    def _get_numeric_severity(self, severity: str) -> float:
        """Severity'yi sayıya çevir"""
        severity_map = {
            'LOW': 0.25, 'DÜŞÜK': 0.25,
            'MEDIUM': 0.5, 'ORTA': 0.5,
            'HIGH': 0.75, 'YÜKSEK': 0.75,
            'CRITICAL': 1.0, 'KRİTİK': 1.0
        }
        return severity_map.get(severity.upper(), 0.5)
    
    def _build_correlation_network(self, correlations: List[ThreatCorrelation]) -> Dict[str, Any]:
        """Korelasyon network'ünü oluştur"""
        try:
            G = nx.Graph()
            
            # Add edges with weights
            for corr in correlations:
                G.add_edge(
                    corr.threat_1_id, 
                    corr.threat_2_id, 
                    weight=corr.correlation_score,
                    correlation_type=corr.correlation_type.value
                )
            
            # Calculate network metrics
            network_info = {
                'nodes': len(G.nodes()),
                'edges': len(G.edges()),
                'density': nx.density(G),
                'connected_components': nx.number_connected_components(G)
            }
            
            # Find central nodes
            if len(G.nodes()) > 0:
                centrality = nx.degree_centrality(G)
                network_info['most_central_threats'] = sorted(
                    centrality.items(), key=lambda x: x[1], reverse=True
                )[:5]
            
            return network_info
            
        except Exception as e:
            logger.error(f"Network building error: {str(e)}")
            return {'nodes': 0, 'edges': 0}
    
    def _find_dominant_threat_type(self, threats: List[Dict]) -> str:
        """Dominant tehdit türünü bul"""
        type_counts = {}
        for threat in threats:
            threat_type = threat.get('threat_type', 'unknown')
            type_counts[threat_type] = type_counts.get(threat_type, 0) + 1
        
        return max(type_counts.items(), key=lambda x: x[1])[0]
    
    def _calculate_cluster_center(self, threats: List[Dict]) -> Dict[str, float]:
        """Küme merkezi hesapla"""
        center = {}
        
        # Average severity
        severities = [self._get_numeric_severity(t.get('severity', 'MEDIUM')) for t in threats]
        center['severity'] = np.mean(severities)
        
        # Average impact probability
        probs = [t.get('impact_probability', 0.1) for t in threats]
        center['impact_probability'] = np.mean(probs)
        
        # Average confidence
        confidences = [t.get('confidence_score', 0.5) for t in threats]
        center['confidence'] = np.mean(confidences)
        
        return center
    
    def _calculate_compound_risk(self, threats: List[Dict]) -> float:
        """Bileşik risk hesapla"""
        individual_risks = [self._get_numeric_severity(t.get('severity', 'MEDIUM')) for t in threats]
        
        # Compound risk is not just sum - diminishing returns
        if not individual_risks:
            return 0.0
        
        # Use quadratic mean for compound effect
        compound = math.sqrt(sum(r**2 for r in individual_risks) / len(individual_risks))
        
        # Add synergy factor
        synergy_factor = 1.0 + (len(threats) - 1) * 0.1  # Each additional threat adds 10%
        
        return min(1.0, compound * synergy_factor)
    
    def _calculate_amplification_factor(self, cluster_size: int) -> float:
        """Risk artırım faktörü hesapla"""
        if cluster_size <= 1:
            return 1.0
        
        # Logarithmic amplification
        return 1.0 + (math.log(cluster_size) * 0.2)
    
    async def _assess_risk_implications(self, threats: List[Dict], correlations: List[ThreatCorrelation], clusters: List[ThreatCluster]) -> Tuple[List[Dict], List[Dict]]:
        """Risk etkilerini değerlendir"""
        compound_risks = []
        amplification_zones = []
        
        try:
            # Compound risk areas from clusters
            for cluster in clusters:
                if cluster.compound_risk_score > 0.6:
                    compound_risks.append({
                        'area_id': cluster.cluster_id,
                        'threat_ids': list(cluster.threat_ids),
                        'compound_risk_score': cluster.compound_risk_score,
                        'amplification_factor': cluster.amplification_factor,
                        'dominant_type': cluster.dominant_threat_type.value
                    })
            
            # Risk amplification zones from high correlation areas
            strong_correlations = [c for c in correlations if c.correlation_strength in [CorrelationStrength.STRONG, CorrelationStrength.VERY_STRONG]]
            
            if strong_correlations:
                # Group by spatial proximity if coordinates available
                spatial_groups = self._group_correlations_spatially(strong_correlations, threats)
                
                for group in spatial_groups:
                    if len(group) >= 2:
                        amplification_zones.append({
                            'zone_id': f"amplification_zone_{len(amplification_zones)}",
                            'correlations': [c.threat_1_id + '-' + c.threat_2_id for c in group],
                            'amplification_potential': np.mean([c.correlation_score for c in group]),
                            'threat_count': len(set([c.threat_1_id for c in group] + [c.threat_2_id for c in group]))
                        })
            
            return compound_risks, amplification_zones
            
        except Exception as e:
            logger.error(f"Risk implications assessment error: {str(e)}")
            return [], []
    
    def _group_correlations_spatially(self, correlations: List[ThreatCorrelation], threats: List[Dict]) -> List[List[ThreatCorrelation]]:
        """Korelasyonları uzaysal olarak grupla"""
        # Simplified spatial grouping - gerçek uygulamada daha sofistike olacak
        spatial_groups = []
        
        spatial_correlations = [c for c in correlations if c.correlation_type == CorrelationType.SPATIAL and c.spatial_distance_km is not None]
        
        if spatial_correlations:
            # Simple grouping by distance threshold
            used_correlations = set()
            
            for corr in spatial_correlations:
                if id(corr) not in used_correlations:
                    group = [corr]
                    used_correlations.add(id(corr))
                    
                    # Find nearby correlations
                    for other_corr in spatial_correlations:
                        if (id(other_corr) not in used_correlations and 
                            other_corr.spatial_distance_km is not None and
                            other_corr.spatial_distance_km < 1000):  # Within 1000km
                            group.append(other_corr)
                            used_correlations.add(id(other_corr))
                    
                    if len(group) > 1:
                        spatial_groups.append(group)
        
        return spatial_groups
    
    def _prepare_threat_summary_for_ai(self, threats: List[Dict]) -> str:
        """AI için tehdit özetini hazırla"""
        summaries = []
        for i, threat in enumerate(threats[:10]):  # Limit to 10 for prompt size
            summary = f"{i+1}. {threat.get('threat_type', 'unknown')} - {threat.get('severity', 'MEDIUM')} - {threat.get('title', 'No title')}"
            summaries.append(summary)
        
        if len(threats) > 10:
            summaries.append(f"... ve {len(threats) - 10} tehdit daha")
        
        return "\n".join(summaries)
    
    def _prepare_correlation_summary_for_ai(self, correlations: List[ThreatCorrelation]) -> str:
        """AI için korelasyon özetini hazırla"""
        summaries = []
        for i, corr in enumerate(correlations[:10]):  # Limit to 10
            summary = f"{i+1}. {corr.correlation_type.value} - {corr.correlation_strength.value} ({corr.correlation_score:.2f})"
            summaries.append(summary)
        
        if len(correlations) > 10:
            summaries.append(f"... ve {len(correlations) - 10} korelasyon daha")
        
        return "\n".join(summaries)
    
    def _parse_ai_pattern_response(self, response_text: str) -> Dict[str, Any]:
        """AI pattern response'unu parse et"""
        try:
            import json
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            
            if start_idx >= 0 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
                return json.loads(json_str)
            else:
                raise ValueError("No valid JSON found")
                
        except Exception as e:
            logger.warning(f"AI pattern response parse error: {str(e)}")
            return self._fallback_ai_patterns()
    
    def _fallback_ai_patterns(self) -> Dict[str, Any]:
        """Fallback AI patterns"""
        return {
            'patterns': [],
            'hidden_relationships': [],
            'synergistic_risks': [],
            'priority_recommendations': [],
            'early_warnings': []
        }
    
    def _calculate_overall_confidence(self, threat_count: int, correlation_count: int, ai_patterns: Dict) -> float:
        """Genel güvenilirlik hesapla"""
        base_confidence = 0.5
        
        # More threats = higher confidence (up to a point)
        threat_factor = min(threat_count / 20.0, 1.0) * 0.2
        
        # More correlations = higher confidence
        correlation_factor = min(correlation_count / 10.0, 1.0) * 0.2
        
        # AI patterns boost confidence
        ai_factor = 0.1 if ai_patterns.get('patterns') else 0.0
        
        return base_confidence + threat_factor + correlation_factor + ai_factor
    
    def _assess_analysis_quality(self, confidence: float, correlation_count: int) -> str:
        """Analiz kalitesi değerlendirmesi"""
        if confidence > 0.8 and correlation_count > 10:
            return "excellent"
        elif confidence > 0.6 and correlation_count > 5:
            return "good"
        elif confidence > 0.4 and correlation_count > 2:
            return "fair"
        else:
            return "poor"
    
    def _create_fallback_analysis(self, threats: List[Dict], start_time: datetime) -> CorrelationAnalysis:
        """Fallback korelasyon analizi"""
        return CorrelationAnalysis(
            analysis_timestamp=start_time,
            total_threats_analyzed=len(threats),
            significant_correlations=[],
            threat_clusters=[],
            overall_confidence=0.3,
            analysis_quality="poor"
        )


# Global service instance
threat_correlation_engine = ThreatCorrelationEngine()

def get_threat_correlation_engine() -> ThreatCorrelationEngine:
    """Dependency injection için"""
    return threat_correlation_engine


# Export main classes
__all__ = [
    'ThreatCorrelationEngine',
    'ThreatCorrelation',
    'ThreatCluster',
    'CorrelationAnalysis',
    'CorrelationType',
    'CorrelationStrength',
    'CausalDirection',
    'SpatialAnalyzer',
    'TemporalAnalyzer',
    'threat_correlation_engine',
    'get_threat_correlation_engine'
]
    def _calculate_simple_similarity(self, feature_vec1: List[float], feature_vec2: List[float]) -> float:
        """Simple cosine similarity fallback without sklearn"""
        try:
            # Calculate dot product
            dot_product = sum(a * b for a, b in zip(feature_vec1, feature_vec2))
            
            # Calculate magnitudes
            magnitude1 = math.sqrt(sum(a * a for a in feature_vec1))
            magnitude2 = math.sqrt(sum(b * b for b in feature_vec2))
            
            # Avoid division by zero
            if magnitude1 == 0 or magnitude2 == 0:
                return 0.0
            
            # Cosine similarity
            return dot_product / (magnitude1 * magnitude2)
            
        except Exception as e:
            logger.error(f"Simple similarity calculation error: {str(e)}")
            return 0.0
    
    def _simple_threat_clustering(self, threats: List[Dict], correlations: List[ThreatCorrelation]) -> List[int]:
        """Simple threat clustering fallback without sklearn"""
        try:
            threat_ids = [t.get('threat_id', f'threat_{i}') for i, t in enumerate(threats)]
            clusters = [-1] * len(threats)
            current_cluster = 0
            
            # Build adjacency list from correlations
            adjacency = {tid: [] for tid in threat_ids}
            for corr in correlations:
                if corr.correlation_score > 0.5:  # Threshold for strong correlation
                    if corr.threat_1_id in adjacency and corr.threat_2_id in adjacency:
                        adjacency[corr.threat_1_id].append(corr.threat_2_id)
                        adjacency[corr.threat_2_id].append(corr.threat_1_id)
            
            # Simple connected components clustering
            for i, threat_id in enumerate(threat_ids):
                if clusters[i] != -1:
                    continue
                
                # Start new cluster with DFS
                stack = [threat_id]
                while stack:
                    current_threat = stack.pop()
                    current_idx = threat_ids.index(current_threat)
                    
                    if clusters[current_idx] == -1:
                        clusters[current_idx] = current_cluster
                        
                        # Add connected threats
                        for neighbor in adjacency.get(current_threat, []):
                            neighbor_idx = threat_ids.index(neighbor) if neighbor in threat_ids else -1
                            if neighbor_idx != -1 and clusters[neighbor_idx] == -1:
                                stack.append(neighbor)
                
                current_cluster += 1
            
            return clusters
            
        except Exception as e:
            logger.error(f"Simple threat clustering error: {str(e)}")
            return [0] * len(threats)
    
    def _simple_network_analysis(self, correlations: List[ThreatCorrelation]) -> Dict[str, Any]:
        """Simple network analysis fallback without NetworkX"""
        try:
            # Build adjacency list
            nodes = set()
            edges = []
            adjacency = {}
            
            for corr in correlations:
                nodes.add(corr.threat_1_id)
                nodes.add(corr.threat_2_id)
                edges.append((corr.threat_1_id, corr.threat_2_id, corr.correlation_score))
                
                # Build adjacency list
                if corr.threat_1_id not in adjacency:
                    adjacency[corr.threat_1_id] = []
                if corr.threat_2_id not in adjacency:
                    adjacency[corr.threat_2_id] = []
                
                adjacency[corr.threat_1_id].append(corr.threat_2_id)
                adjacency[corr.threat_2_id].append(corr.threat_1_id)
            
            # Calculate simple metrics
            node_count = len(nodes)
            edge_count = len(edges)
            
            # Simple density calculation
            max_edges = node_count * (node_count - 1) / 2 if node_count > 1 else 0
            density = edge_count / max_edges if max_edges > 0 else 0
            
            # Find most connected nodes (degree centrality approximation)
            degree_counts = {}
            for node in nodes:
                degree_counts[node] = len(adjacency.get(node, []))
            
            most_central = sorted(degree_counts.items(), key=lambda x: x[1], reverse=True)[:5]
            
            # Simple connected components count
            visited = set()
            components = 0
            
            for node in nodes:
                if node not in visited:
                    # DFS to mark connected component
                    stack = [node]
                    while stack:
                        current = stack.pop()
                        if current not in visited:
                            visited.add(current)
                            stack.extend(adjacency.get(current, []))
                    components += 1
            
            return {
                'nodes': node_count,
                'edges': edge_count,
                'density': density,
                'connected_components': components,
                'most_central_threats': most_central
            }
            
        except Exception as e:
            logger.error(f"Simple network analysis error: {str(e)}")
            return {'nodes': 0, 'edges': 0, 'density': 0, 'connected_components': 0}
