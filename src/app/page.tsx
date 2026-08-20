import Chat from "@/components/Chat";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white font-sans text-zinc-900">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-center px-6 py-8">
        <span className="text-lg font-bold tracking-tight text-zinc-900">
          ✨ AI Assistant
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center pb-16">
        <section className="max-w-2xl px-6 pb-8 pt-4 text-center">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Ask me{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              anything
            </span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-zinc-600">
            A general knowledge assistant powered by Google Gemini with search
            grounding — so answers are accurate and up to date. News, facts,
            how-tos, coding, writing, ideas and more.
          </p>
        </section>

        <section className="w-full max-w-2xl px-6">
          <Chat />
        </section>
      </main>

      <footer className="border-t border-zinc-100 py-8 text-center text-sm text-zinc-500">
        Powered by Google Gemini · Answers may reference live web search results
      </footer>
    </div>
  );
}