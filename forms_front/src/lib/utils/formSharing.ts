/**
 * Utility functions for generating shareable form URLs and handling guest form access
 */

export interface ShareableFormOptions {
  baseUrl?: string
  utm?: {
    source?: string
    medium?: string
    campaign?: string
  }
}

/**
 * Generate a shareable URL for a form using its code (guest access)
 */
export function generateFormShareUrl(
  formCode: string,
  options: ShareableFormOptions = {}
): string {
  const { baseUrl = window.location.origin, utm } = options

  // Use the guest form endpoint by code
  let url = `${baseUrl}/guest/${formCode}`

  if (utm) {
    const params = new URLSearchParams()
    if (utm.source) params.append('utm_source', utm.source)
    if (utm.medium) params.append('utm_medium', utm.medium)
    if (utm.campaign) params.append('utm_campaign', utm.campaign)

    if (params.toString()) {
      url += `?${params.toString()}`
    }
  }

  return url
}

/**
 * Generate a shareable URL for a form using its ID (guest access)
 */
export function generateFormShareUrlById(
  formId: string,
  options: ShareableFormOptions = {}
): string {
  const { baseUrl = window.location.origin, utm } = options

  // Use the guest form endpoint by ID  
  let url = `${baseUrl}/guest/id/${formId}`

  if (utm) {
    const params = new URLSearchParams()
    if (utm.source) params.append('utm_source', utm.source)
    if (utm.medium) params.append('utm_medium', utm.medium)
    if (utm.campaign) params.append('utm_campaign', utm.campaign)

    if (params.toString()) {
      url += `?${params.toString()}`
    }
  }

  return url
}

/**
 * Generate QR code data URL for a form
 */
export function generateFormQRCodeData(formCode: string): string {
  const url = generateFormShareUrl(formCode)
  // In a real implementation, you would use a QR code library like 'qrcode'
  // For now, return a placeholder
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
}

/**
 * Copy form URL to clipboard
 */
export async function copyFormUrlToClipboard(formCode: string): Promise<boolean> {
  try {
    const url = generateFormShareUrl(formCode)
    await navigator.clipboard.writeText(url)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

/**
 * Share form via Web Share API (mobile)
 */
export async function shareFormNatively(
  formCode: string,
  formTitle: string
): Promise<boolean> {
  if (!navigator.share) {
    return false
  }

  try {
    const url = generateFormShareUrl(formCode)
    await navigator.share({
      title: formTitle,
      text: `يرجى تعبئة هذه الوثيقة: ${formTitle}`,
      url: url
    })
    return true
  } catch (error) {
    console.error('Failed to share:', error)
    return false
  }
}

/**
 * Generate email sharing content
 */
export function generateEmailShareContent(
  formCode: string,
  formTitle: string,
  customMessage?: string
): {
  subject: string
  body: string
  mailto: string
} {
  const url = generateFormShareUrl(formCode)
  const subject = `وثيقة للتعبئة: ${formTitle}`
  const defaultMessage = `يرجى تعبئة هذه الوثيقة:`
  const message = customMessage || defaultMessage

  const body = `${message}

${formTitle}
${url}

شكراً لك`

  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  return { subject, body, mailto }
}

/**
 * Generate WhatsApp sharing content
 */
export function generateWhatsAppShareContent(
  formCode: string,
  formTitle: string,
  customMessage?: string
): string {
  const url = generateFormShareUrl(formCode)
  const defaultMessage = `يرجى تعبئة الوثيقة التالية:`
  const message = customMessage || defaultMessage

  const text = `${message}

*${formTitle}*
${url}`

  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

/**
 * Generate social media sharing URLs
 */
export function generateSocialShareUrls(
  formCode: string,
  formTitle: string
): {
  twitter: string
  facebook: string
  linkedin: string
  telegram: string
} {
  const url = generateFormShareUrl(formCode)
  const text = `يرجى تعبئة هذه الوثيقة: ${formTitle}`

  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
  }
}

/**
 * Validate form code format
 */
export function isValidFormCode(code: string): boolean {
  // Form codes should be alphanumeric with underscores, 3-50 characters
  const codeRegex = /^[A-Z0-9_]{3,50}$/
  return codeRegex.test(code)
}

/**
 * Validate form ID format (UUID)
 */
export function isValidFormId(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}