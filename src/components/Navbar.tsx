import { Link } from "react-router-dom";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 h-14 md:h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl h-full px-4 flex items-center">
        <Link
          to="/"
          className="text-lg md:text-xl font-semibold tracking-tight hover:opacity-80 transition"
        >
          CAPEMISA <span className="text-muted-foreground">Conecta</span>
        </Link>
      </div>
    </header>
  );
}
