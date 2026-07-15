/**
 * Route optimizer using Nearest Neighbor heuristic + 2-opt improvement.
 * Works entirely client-side with no external API keys required.
 * Uses Haversine distance between GPS coordinates.
 */

export interface RoutePoint {
  address: string
  lat?: number
  lng?: number
  contactName?: string
  contactPhone?: string
  notes?: string
  order?: number
  label?: string // for display only
}

// Haversine distance in km between two GPS coords
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Simple string-based distance fallback when no coords available (always 1)
function dist(a: RoutePoint, b: RoutePoint): number {
  if (a.lat !== undefined && a.lng !== undefined && b.lat !== undefined && b.lng !== undefined) {
    return haversine(a.lat, a.lng, b.lat, b.lng)
  }
  return 1 // no coords → treat as equal distance
}

function totalDistance(route: RoutePoint[]): number {
  let d = 0
  for (let i = 0; i < route.length - 1; i++) {
    d += dist(route[i], route[i + 1])
  }
  return d
}

// Nearest Neighbor heuristic starting from first point (pickup is fixed)
function nearestNeighbor(points: RoutePoint[]): RoutePoint[] {
  if (points.length <= 2) return [...points]
  const fixed = [points[0]] // pickup always first
  const remaining = points.slice(1, points.length - 1) // middle stops to reorder
  const end = points[points.length - 1] // delivery always last
  
  const visited: boolean[] = new Array(remaining.length).fill(false)
  const route: RoutePoint[] = []
  let current = fixed[0]

  for (let step = 0; step < remaining.length; step++) {
    let bestIdx = -1
    let bestDist = Infinity
    for (let j = 0; j < remaining.length; j++) {
      if (!visited[j]) {
        const d = dist(current, remaining[j])
        if (d < bestDist) {
          bestDist = d
          bestIdx = j
        }
      }
    }
    if (bestIdx >= 0) {
      visited[bestIdx] = true
      route.push(remaining[bestIdx])
      current = remaining[bestIdx]
    }
  }

  return [...fixed, ...route, end]
}

// 2-opt improvement on middle stops (keep first and last fixed)
function twoOpt(points: RoutePoint[]): RoutePoint[] {
  if (points.length <= 3) return points
  const fixed = points[0]
  const end = points[points.length - 1]
  let middle = points.slice(1, points.length - 1)
  
  let improved = true
  while (improved) {
    improved = false
    for (let i = 0; i < middle.length - 1; i++) {
      for (let j = i + 1; j < middle.length; j++) {
        // Reverse segment from i to j
        const newMiddle = [
          ...middle.slice(0, i),
          ...middle.slice(i, j + 1).reverse(),
          ...middle.slice(j + 1),
        ]
        const oldRoute = [fixed, ...middle, end]
        const newRoute = [fixed, ...newMiddle, end]
        if (totalDistance(newRoute) < totalDistance(oldRoute) - 0.001) {
          middle = newMiddle
          improved = true
        }
      }
    }
  }
  
  return [fixed, ...middle, end]
}

/**
 * Optimizes a list of route points.
 * - First point (pickup) and last point (delivery) are always kept in place.
 * - Middle stops are reordered for minimum distance.
 * Returns reordered points with updated `order` fields.
 */
export function optimizeRoute(points: RoutePoint[]): RoutePoint[] {
  if (points.length <= 2) return points.map((p, i) => ({ ...p, order: i + 1 }))
  
  const hasCoords = points.some(p => p.lat !== undefined && p.lng !== undefined)
  console.log(`Optimizing route with ${points.length} points, hasCoords: ${hasCoords}`)
  
  const nn = nearestNeighbor(points)
  const optimized = twoOpt(nn)
  
  const before = totalDistance(points)
  const after = totalDistance(optimized)
  console.log(`Route optimization: ${before.toFixed(2)}km → ${after.toFixed(2)}km (saved ${(before - after).toFixed(2)}km)`)
  
  return optimized.map((p, i) => ({ ...p, order: i + 1 }))
}

/**
 * Returns estimated total route distance in km.
 */
export function estimateRouteDistance(points: RoutePoint[]): number {
  return totalDistance(points)
}
