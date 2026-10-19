import { MessageCircle } from "lucide-react";
export default function ChatbotButton() {
  return (
    <button
      type="button"
      aria-label="Mở trợ lý SmashFlow"
      className="fixed bottom-7 right-7 z-40 grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:scale-105 hover:bg-emerald-600"
    >
      <MessageCircle size={27} />
    </button>
  );
}
