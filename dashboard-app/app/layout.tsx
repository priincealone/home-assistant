import "./globals.css";

export const metadata = {
  title: "Casa — painel",
  description: "Painel de automação residencial (V1 de validação)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
