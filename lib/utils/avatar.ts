/**
 * Generate a gradient background style from a wallet address
 * Creates a unique, deterministic gradient for each address
 */

// Color palettes for gradients
const GRADIENT_COLORS = [
  ['#667eea', '#764ba2'], // Purple-violet
  ['#f093fb', '#f5576c'], // Pink-red
  ['#4facfe', '#00f2fe'], // Blue-cyan
  ['#43e97b', '#38f9d7'], // Green-teal
  ['#fa709a', '#fee140'], // Pink-yellow
  ['#a8edea', '#fed6e3'], // Teal-pink light
  ['#5ee7df', '#b490ca'], // Cyan-purple
  ['#d299c2', '#fef9d7'], // Pink-cream
  ['#89f7fe', '#66a6ff'], // Cyan-blue
  ['#cd9cf2', '#f6f3ff'], // Purple-white
  ['#fddb92', '#d1fdff'], // Yellow-cyan
  ['#9890e3', '#b1f4cf'], // Purple-green
  ['#96fbc4', '#f9f586'], // Green-yellow
  ['#2af598', '#009efd'], // Green-blue
  ['#ff9a9e', '#fecfef'], // Pink-light pink
  ['#ffecd2', '#fcb69f'], // Cream-peach
]

/**
 * Hash a string to a number
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Get gradient colors for a wallet address
 */
export function getGradientColors(address: string): [string, string] {
  const hash = hashString(address.toLowerCase())
  const index = hash % GRADIENT_COLORS.length
  return GRADIENT_COLORS[index] as [string, string]
}

/**
 * Get a CSS gradient string for a wallet address
 */
export function getAddressGradient(address: string, direction: string = '135deg'): string {
  const [color1, color2] = getGradientColors(address)
  return `linear-gradient(${direction}, ${color1}, ${color2})`
}

/**
 * Get gradient style object for React
 */
export function getGradientStyle(address: string): React.CSSProperties {
  return {
    background: getAddressGradient(address),
  }
}
