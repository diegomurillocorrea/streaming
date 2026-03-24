import { Geist_Mono, Poppins } from "next/font/google"
import "./globals.css"

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata = {
  title: {
    default: "DAIEGO Streaming",
    template: "DAIEGO Streaming | %s",
  },
  description: "Aplicación de administración para gestionar DAIEGO Streaming",
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body
        className={`${poppins.variable} ${geistMono.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
