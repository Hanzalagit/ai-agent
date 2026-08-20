import Chat from "@/components/Chat";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white font-sans text-zinc-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-fuchsia-500 text-lg">
            🌸
          </span>
          <span className="text-lg font-bold tracking-tight">
            Ay Cosmetics
          </span>
        </div>
        <nav className="hidden gap-6 text-sm font-medium text-zinc-600 sm:flex">
          <span className="hover:text-rose-600">Shop</span>
          <span className="hover:text-rose-600">Skincare</span>
          <span className="hover:text-rose-600">Makeup</span>
          <span className="hover:text-rose-600">Book a Visit</span>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-12 px-6 pb-16 lg:flex-row lg:items-start lg:gap-16">
        <section className="flex max-w-xl flex-col items-start justify-center pt-8 lg:pt-20">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Beauty that{" "}
            <span className="bg-gradient-to-r from-rose-500 to-fuchsia-600 bg-clip-text text-transparent">
              cares
            </span>{" "}
            for you
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-zinc-600">
            Premium skincare, makeup and in-store beauty services across
            Pakistan. Need help picking a product, tracking an order, or
            booking a consultation? Chat with Asha — our AI assistant — and
            get instant answers.
          </p>

          <ul className="mt-8 w-full space-y-4">
            {[
              ["🛍️", "Shop products", "Serums, creams, makeup & more"],
              ["📦", "Track orders", "Real-time order status"],
              ["📅", "Book services", "Consultations & makeup appointments"],
              ["❓", "Ask anything", "Returns, policies & FAQs"],
            ].map(([icon, title, sub]) => (
              <li
                key={title}
                className="flex items-center gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/60 px-4 py-3"
              >
                <span className="text-xl">{icon}</span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-sm text-zinc-500">{sub}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="w-full max-w-2xl flex-1 lg:pt-10">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Assistant
            </h2>
            <span className="text-xs text-zinc-400">Powered by Google Gemini</span>
          </div>
          <Chat />
        </section>
      </main>

      <footer className="border-t border-zinc-100 py-8 text-center text-sm text-zinc-500">
        © {new Date().getFullYear()} Ay Cosmetics · support@aycosmetics.com ·
        +92-300-1112233
      </footer>
    </div>
  );
}