import "./globals.css";

export const metadata = {
  title: "DAIEGO Streaming",
  description: "Aplicación para administrar el servicio de DAIEGO Streaming",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
