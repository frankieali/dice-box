export function lerp(a, b, alpha) {
  return a * (1 - alpha) + b * alpha;
}