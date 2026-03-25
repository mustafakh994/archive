export default function GuestLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Guest forms should be accessible to everyone, no authentication required
  return <>{children}</>
}