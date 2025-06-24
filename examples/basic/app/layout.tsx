import type { ReactNode } from 'react'

export default function RootLayout({ children, params }: { children: ReactNode; params: Record<string, string> }) {
  return (
    <html lang="en">
      <body>
        <header>Drift Example App</header>
        <main>{children}</main>
        <footer>Footer</footer>
      </body>
    </html>
  )
} 