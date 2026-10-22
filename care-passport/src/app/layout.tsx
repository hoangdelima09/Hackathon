import type { Metadata } from "next";
import { Providers } from "./providers";
import { SimPlatformProvider, TidePlatformProvider } from "@/lib/client/platform";
import { SIMULATED } from "@/lib/mode";
import "./globals.css";

export const metadata: Metadata = {
  title: "Care Passport",
  description: "Patient-directed sharing of health records, enforced by Tide's network. Synthetic demo.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {SIMULATED ? (
          <SimPlatformProvider>{children}</SimPlatformProvider>
        ) : (
          <Providers>
            <TidePlatformProvider>{children}</TidePlatformProvider>
          </Providers>
        )}
      </body>
    </html>
  );
}
