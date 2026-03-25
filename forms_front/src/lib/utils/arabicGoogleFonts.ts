// Arabic Google Fonts list
// These fonts support Arabic script from Google Fonts

export interface GoogleFont {
  name: string
  displayName: string
  weights: number[]
}

export const ARABIC_GOOGLE_FONTS: GoogleFont[] = [
  { name: 'Cairo', displayName: 'Cairo (القاهرة)', weights: [200, 300, 400, 500, 600, 700, 800, 900] },
  { name: 'Tajawal', displayName: 'Tajawal (تجوال)', weights: [200, 300, 400, 500, 700, 800, 900] },
  { name: 'Amiri', displayName: 'Amiri (أميري)', weights: [400, 700] },
  { name: 'Almarai', displayName: 'Almarai (المرعي)', weights: [300, 400, 700, 800] },
  { name: 'Noto Sans Arabic', displayName: 'Noto Sans Arabic (نوتو سانس)', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { name: 'Noto Kufi Arabic', displayName: 'Noto Kufi Arabic (نوتو كوفي)', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { name: 'Harmattan', displayName: 'Harmattan (هرماتان)', weights: [400, 500, 600, 700] },
  { name: 'Lateef', displayName: 'Lateef (لطيف)', weights: [200, 300, 400, 500, 600, 700, 800] },
  { name: 'Markazi Text', displayName: 'Markazi Text (مركزي)', weights: [400, 500, 600, 700] },
  { name: 'Scheherazade New', displayName: 'Scheherazade New (شهرزاد)', weights: [400, 500, 600, 700] },
  { name: 'Reem Kufi', displayName: 'Reem Kufi (ريم كوفي)', weights: [400, 500, 600, 700] },
  { name: 'El Messiri', displayName: 'El Messiri (المسيري)', weights: [400, 500, 600, 700] },
  { name: 'Changa', displayName: 'Changa (شانجا)', weights: [200, 300, 400, 500, 600, 700, 800] },
  { name: 'Lalezar', displayName: 'Lalezar (لالهزار)', weights: [400] },
  { name: 'Mada', displayName: 'Mada (مدا)', weights: [200, 300, 400, 500, 600, 700, 900] },
  { name: 'Aref Ruqaa', displayName: 'Aref Ruqaa (عارف رقعة)', weights: [400, 700] },
  { name: 'Ruwudu', displayName: 'Ruwudu (روودو)', weights: [400, 500, 600, 700] },
  { name: 'Rakkas', displayName: 'Rakkas (رقاص)', weights: [400] },
  { name: 'Katibeh', displayName: 'Katibeh (كاتبة)', weights: [400] },
  { name: 'Mirza', displayName: 'Mirza (ميرزا)', weights: [400, 500, 600, 700] },
  { name: 'Vibes', displayName: 'Vibes (فايبز)', weights: [400] },
  { name: 'Aref Ruqaa Ink', displayName: 'Aref Ruqaa Ink (عارف رقعة حبر)', weights: [400, 700] },
  { name: 'IBM Plex Sans Arabic', displayName: 'IBM Plex Sans Arabic (آي بي إم)', weights: [100, 200, 300, 400, 500, 600, 700] },
  { name: 'Readex Pro', displayName: 'Readex Pro (ريديكس برو)', weights: [200, 300, 400, 500, 600, 700] },
  { name: 'Kufam', displayName: 'Kufam (كوفام)', weights: [400, 500, 600, 700, 800, 900] },
  { name: 'Jomhuria', displayName: 'Jomhuria (جمهورية)', weights: [400] },
  { name: 'Baloo Bhaijaan 2', displayName: 'Baloo Bhaijaan 2 (بالو بهايجان)', weights: [400, 500, 600, 700, 800] },
  { name: 'Reem Kufi Fun', displayName: 'Reem Kufi Fun (ريم كوفي فن)', weights: [400, 500, 600, 700] },
  { name: 'Reem Kufi Ink', displayName: 'Reem Kufi Ink (ريم كوفي حبر)', weights: [400] },
]

// Default font
export const DEFAULT_ARABIC_FONT = 'Cairo'

// Helper function to get Google Fonts URL
export const getGoogleFontUrl = (fontName: string, weights?: number[]): string => {
  const font = ARABIC_GOOGLE_FONTS.find(f => f.name === fontName)
  if (!font) return ''
  
  const weightsToLoad = weights || font.weights
  const fontFamily = fontName.replace(/ /g, '+')
  const weightsString = weightsToLoad.join(';')
  
  return `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@${weightsString}&display=swap&subset=arabic`
}

// Helper function to load a font dynamically
export const loadGoogleFont = (fontName: string): void => {
  // Check if font is already loaded
  const existingLink = document.querySelector(`link[data-font="${fontName}"]`)
  if (existingLink) return
  
  // Create link element
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = getGoogleFontUrl(fontName)
  link.setAttribute('data-font', fontName)
  
  // Append to head
  document.head.appendChild(link)
}

