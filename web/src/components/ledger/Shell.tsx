import { Masthead } from "./Masthead";
import { Footer } from "./Footer";

/** Newspaper chrome wrapping every route: dateline + masthead + nav → main → footer. */
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Masthead />
      <main className="mx-auto max-w-[1160px] px-7 pb-[90px]">{children}</main>
      <Footer />
    </div>
  );
}
