import type { Metadata } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { ToastProvider } from '../components/ui/Toast'
import { OfflineIndicator } from '../components/ui/OfflineIndicator'

const cairo = Cairo({
    subsets: ['arabic', 'latin'],
    weight: ['200', '300', '400', '500', '600', '700', '800', '900'],
    display: 'swap',
})

export const metadata: Metadata = {
    title: 'منشئ قوالب الوثائق',
    description: 'إنشاء وإدارة قوالب الوثائق بسهولة',
    // Cache-busting meta tags
    other: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="ar" dir="rtl">
            <head>
                <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
                <meta httpEquiv="Pragma" content="no-cache" />
                <meta httpEquiv="Expires" content="0" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </head>
            <body className={`${cairo.className} rtl`}>
                <ErrorBoundary>
                    <ToastProvider>
                        <OfflineIndicator />
                        {children}
                    </ToastProvider>
                </ErrorBoundary>
            </body>
        </html>
    )
} 