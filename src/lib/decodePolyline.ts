/**
 * Decodes a Google-encoded polyline string into an array of [lng, lat] pairs.
 * Ola Maps Directions API returns the route as an encoded polyline.
 * MapLibre/GeoJSON expects coordinates in [lng, lat] order.
 */
export function decodePolyline(encoded: string): [number, number][] {
    const coords: [number, number][] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
        let shift = 0;
        let result = 0;
        let byte: number;

        // Decode latitude
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
        lat += deltaLat;

        shift = 0;
        result = 0;

        // Decode longitude
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
        lng += deltaLng;

        // Ola Maps uses 1e5 precision
        coords.push([lng / 1e5, lat / 1e5]);
    }

    return coords;
}
