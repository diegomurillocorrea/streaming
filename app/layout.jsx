import "./globals.css";

export const metadata = {
  title: "Streaming Murillo App",
  description: "An App to administrate the Streaming Murillo Service",
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
