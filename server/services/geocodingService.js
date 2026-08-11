/**
 * Geocoding Service — converts any Indian address into GPS coordinates.
 * Uses OpenStreetMap Nominatim (free, no API key required) with a
 * comprehensive fallback table of major Indian cities.
 *
 * Supports the ENTIRE COUNTRY OF INDIA — no state is hardcoded.
 *
 * CRITICAL: NEVER returns fake coordinates. If geocoding fails, returns null.
 * The frontend handles null coordinates by skipping markers gracefully.
 */

// Fallback coordinates for major Indian cities (used only if Nominatim fails)
const INDIA_CITY_COORDS = {
    // Northern India
    'delhi': { lat: 28.6139, lng: 77.2090 },
    'new delhi': { lat: 28.6139, lng: 77.2090 },
    'gurugram': { lat: 28.4595, lng: 77.0266 },
    'gurgaon': { lat: 28.4595, lng: 77.0266 },
    'noida': { lat: 28.5355, lng: 77.3910 },
    'lucknow': { lat: 26.8467, lng: 80.9462 },
    'kanpur': { lat: 26.4499, lng: 80.3319 },
    'varanasi': { lat: 25.3176, lng: 82.9739 },
    'agra': { lat: 27.1767, lng: 78.0081 },
    'jaipur': { lat: 26.9124, lng: 75.7873 },
    'jodhpur': { lat: 26.2389, lng: 73.0243 },
    'udaipur': { lat: 24.5854, lng: 73.7125 },
    'chandigarh': { lat: 30.7333, lng: 76.7794 },
    'amritsar': { lat: 31.6340, lng: 74.8723 },
    'ludhiana': { lat: 30.9010, lng: 75.8573 },
    'dehradun': { lat: 30.3165, lng: 78.0322 },
    'shimla': { lat: 31.1048, lng: 77.1734 },
    'srinagar': { lat: 34.0837, lng: 74.7973 },
    'jammu': { lat: 32.7266, lng: 74.8570 },

    // Western India
    'mumbai': { lat: 19.0760, lng: 72.8777 },
    'navi mumbai': { lat: 19.0330, lng: 73.0297 },
    'thane': { lat: 19.2183, lng: 72.9781 },
    'pune': { lat: 18.5204, lng: 73.8567 },
    'nagpur': { lat: 21.1458, lng: 79.0882 },
    'nashik': { lat: 19.9975, lng: 73.7898 },
    'surat': { lat: 21.1702, lng: 72.8311 },
    'vadodara': { lat: 22.3072, lng: 73.1812 },
    'ahmedabad': { lat: 23.0225, lng: 72.5714 },
    'rajkot': { lat: 22.3039, lng: 70.8022 },
    'goa': { lat: 15.2993, lng: 74.1240 },
    'panaji': { lat: 15.4909, lng: 73.8278 },
    'indore': { lat: 22.7196, lng: 75.8577 },
    'bhopal': { lat: 23.2599, lng: 77.4126 },
    'gwalior': { lat: 26.2183, lng: 78.1828 },

    // Southern India
    'chennai': { lat: 13.0827, lng: 80.2707 },
    'coimbatore': { lat: 11.0168, lng: 76.9558 },
    'madurai': { lat: 9.9252, lng: 78.1198 },
    'salem': { lat: 11.6643, lng: 78.1460 },
    'trichy': { lat: 10.7905, lng: 78.7047 },
    'tiruchirappalli': { lat: 10.7905, lng: 78.7047 },
    'bangalore': { lat: 12.9716, lng: 77.5946 },
    'bengaluru': { lat: 12.9716, lng: 77.5946 },
    'mysore': { lat: 12.2958, lng: 76.6394 },
    'mysuru': { lat: 12.2958, lng: 76.6394 },
    'mangalore': { lat: 12.9141, lng: 74.8560 },
    'mangaluru': { lat: 12.9141, lng: 74.8560 },
    'hubli': { lat: 15.3647, lng: 75.1240 },
    'hubballi': { lat: 15.3647, lng: 75.1240 },
    'hyderabad': { lat: 17.3850, lng: 78.4867 },
    'secunderabad': { lat: 17.4399, lng: 78.4983 },
    'warangal': { lat: 17.9689, lng: 79.5941 },
    'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
    'vijayawada': { lat: 16.5062, lng: 80.6480 },
    'guntur': { lat: 16.3067, lng: 80.4365 },
    'nellore': { lat: 14.4426, lng: 79.9865 },
    'kurnool': { lat: 15.8281, lng: 78.0373 },
    'tirupati': { lat: 13.6288, lng: 79.4192 },
    'tirupathi': { lat: 13.6288, lng: 79.4192 },
    'kakinada': { lat: 16.9891, lng: 82.2475 },
    'rajahmundry': { lat: 17.0054, lng: 81.7809 },
    'ongole': { lat: 15.5057, lng: 80.0499 },
    'eluru': { lat: 16.7107, lng: 81.0952 },
    'tenali': { lat: 16.2432, lng: 80.6409 },
    'thiruvananthapuram': { lat: 8.5241, lng: 76.9366 },
    'trivandrum': { lat: 8.5241, lng: 76.9366 },
    'kochi': { lat: 9.9312, lng: 76.2673 },
    'kochin': { lat: 9.9312, lng: 76.2673 },
    'kollam': { lat: 8.8932, lng: 76.6141 },
    'kannur': { lat: 11.8745, lng: 75.3704 },
    'kozhikode': { lat: 11.2588, lng: 75.7804 },
    'calicut': { lat: 11.2588, lng: 75.7804 },

    // Eastern India
    'kolkata': { lat: 22.5726, lng: 88.3639 },
    'kolkatta': { lat: 22.5726, lng: 88.3639 },
    'howrah': { lat: 22.5958, lng: 88.2636 },
    'siliguri': { lat: 26.7271, lng: 88.3953 },
    'durgapur': { lat: 23.5204, lng: 87.3119 },
    'patna': { lat: 25.5941, lng: 85.1376 },
    'gaya': { lat: 24.7914, lng: 85.0002 },
    'ranchi': { lat: 23.3441, lng: 85.3096 },
    'jamshedpur': { lat: 22.8046, lng: 86.2029 },
    'dhanbad': { lat: 23.7957, lng: 86.4304 },
    'bhubaneswar': { lat: 20.2961, lng: 85.8245 },
    'bhubaneshwar': { lat: 20.2961, lng: 85.8245 },
    'cuttack': { lat: 20.4625, lng: 85.8828 },
    'rourkela': { lat: 22.2604, lng: 84.8536 },
    'guwahati': { lat: 26.1445, lng: 91.7362 },
    'dispur': { lat: 26.1433, lng: 91.7898 },
    'shillong': { lat: 25.5788, lng: 91.8933 },
    'imphal': { lat: 24.8170, lng: 93.9368 },
    'agartala': { lat: 23.8315, lng: 91.2868 },
    'aizawl': { lat: 23.7271, lng: 92.7176 },
    'kohima': { lat: 25.6751, lng: 94.1086 },
    'itanagar': { lat: 27.0844, lng: 93.6053 },
    'gangtok': { lat: 27.3389, lng: 88.6065 },

    // Central India — fallback
    'raipur': { lat: 21.2514, lng: 81.6296 },
    'bilaspur': { lat: 22.0797, lng: 82.1391 },
    'jabalpur': { lat: 23.1815, lng: 79.9864 },
    'ujjain': { lat: 23.1765, lng: 75.7885 }
};

/**
 * Build a search query from structured parts.
 */
function buildQuery(parts) {
    return parts
        .filter(p => p && String(p).trim())
        .map(p => String(p).trim())
        .join(', ');
}

/**
 * Look up coordinates from the fallback city table.
 */
function lookupCityCoords(locationString) {
    if (!locationString) return null;
    const normalized = locationString.toLowerCase().trim();

    for (const [city, coords] of Object.entries(INDIA_CITY_COORDS)) {
        if (normalized.includes(city)) {
            return { ...coords };
        }
    }
    return null;
}

/**
 * Geocode an address via Nominatim (OpenStreetMap).
 */
async function geocodeWithNominatim(query) {
    if (!query) return null;

    const url = 'https://nominatim.openstreetmap.org/search';
    const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: '1',
        countrycodes: 'in',
        'accept-language': 'en'
    });

    try {
        const response = await fetch(`${url}?${params.toString()}`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
            headers: {
                'User-Agent': 'ZERO-WASTE-AI/1.0 (food-rescue-platform)'
            }
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (data && data.length > 0) {
            const result = data[0];
            return {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon)
            };
        }
        return null;
    } catch (error) {
        console.error('Nominatim geocoding error:', error.message);
        return null;
    }
}

/**
 * Public geocoding entry point.
 * Accepts either:
 *   - A string (full address / location)
 *   - An object with { address, city, district, state, pincode }
 *
 * Returns { lat, lng } or null if resolution fails.
 * NEVER returns fake/invented coordinates.
 */
async function geocodeAddress(locationData) {
    try {
        let query = '';
        let fallbackString = '';

        if (typeof locationData === 'string') {
            query = locationData;
            fallbackString = locationData;
        } else if (locationData && typeof locationData === 'object') {
            const { address, city, district, state, pincode } = locationData;
            query = buildQuery([address, city, district, state, pincode, 'India']);
            fallbackString = buildQuery([city, district, state, address]);
        }

        // 1. Try Nominatim first
        const nominatimCoords = await geocodeWithNominatim(query);
        if (nominatimCoords) {
            return nominatimCoords;
        }

        // 2. Fall back to city coordinate table
        const cityCoords = lookupCityCoords(fallbackString || query);
        if (cityCoords) {
            return cityCoords;
        }

        // 3. Geocoding failed — return null, do NOT invent fake coordinates
        console.warn('Geocoding failed for:', query);
        return null;
    } catch (error) {
        console.error('Geocoding error:', error.message);
        // Try fallback on API failure
        const cityCoords = lookupCityCoords(
            typeof locationData === 'string' ? locationData : buildQuery([
                locationData && locationData.city,
                locationData && locationData.district,
                locationData && locationData.state,
                locationData && locationData.address
            ])
        );
        return cityCoords || null;
    }
}

/**
 * Compute haversine distance (km) between two GPS points.
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
    if (!lat1 || !lng1 || !lat2 || !lng2) return null;
    const toRad = (deg) => deg * Math.PI / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

module.exports = {
    geocodeAddress,
    haversineDistance,
    lookupCityCoords,
    INDIA_CITY_COORDS
};