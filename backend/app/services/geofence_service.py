import math
from typing import List, Dict, Any, Tuple, Optional

class GeofenceService:
    EARTH_RADIUS_METERS = 6371000.0  # Mean radius of Earth in meters

    def calculate_haversine_distance(
        self, 
        lat1: float, 
        lon1: float, 
        lat2: float, 
        lon2: float
    ) -> float:
        """
        Calculate the great-circle distance between two points on the Earth 
        using the Haversine formula. Returns distance in meters.
        """
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2 +
            math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        distance = self.EARTH_RADIUS_METERS * c
        return round(distance, 2)

    def evaluate_geofences(
        self, 
        user_lat: float, 
        user_lon: float, 
        geofences: List[Dict[str, Any]]
    ) -> Tuple[bool, Optional[Dict[str, Any]], float]:
        """
        Check if user's GPS coordinates fall within any active geofenced office perimeter.
        Returns:
            (is_inside, matched_geofence, distance_in_meters)
        """
        if not geofences:
            # If no geofences configured, treat as open check-in
            return True, None, 0.0

        closest_fence = None
        min_distance = float('inf')

        for fence in geofences:
            if not fence.get("is_active", True):
                continue

            fence_lat = fence.get("latitude")
            fence_lon = fence.get("longitude")
            radius = fence.get("radius_meters", 100.0)

            if fence_lat is None or fence_lon is None:
                continue

            dist = self.calculate_haversine_distance(user_lat, user_lon, fence_lat, fence_lon)
            
            if dist < min_distance:
                min_distance = dist
                closest_fence = fence

            if dist <= radius:
                return True, fence, dist

        return False, closest_fence, min_distance

geofence_service = GeofenceService()
