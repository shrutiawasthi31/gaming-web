import "./globals.css";

export const metadata = {
  title: "PulsePlay Arena",
  description:
    "A gaming app website with live squads, account login, leaderboard tracking, and a playable mini-game.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
