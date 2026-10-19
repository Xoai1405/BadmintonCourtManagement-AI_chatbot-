import Navbar from "../components/Navbar";
export default function FeaturePlaceholderPage({ title, description }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-slate-800">{title}</h1>
        <p className="mt-2 text-slate-500">{description}</p>
        <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
          Khu vực này đã sẵn sàng để tích hợp chức năng.
        </section>
      </main>
    </div>
  );
}
