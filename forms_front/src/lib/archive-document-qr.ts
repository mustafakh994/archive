/**
 * Remote QR image (api.qrserver.com).
 * Use {@link ARCHIVE_QR_PRINT_PIXEL_SIZE} for print so 8×8 cm stays sharp (~300 dpi).
 */
export const ARCHIVE_QR_DISPLAY_PIXEL_SIZE = 280
/** Pixel size requested for the PNG used when printing at 8×8 cm on A4. */
export const ARCHIVE_QR_PRINT_PIXEL_SIZE = 1000

/** Remote QR image (same approach as FormSharingModal / ShareFormButton). */
export function getArchiveQrImageUrl(encodedData: string, size = ARCHIVE_QR_DISPLAY_PIXEL_SIZE): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(encodedData)}`
}
