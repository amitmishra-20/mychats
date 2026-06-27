export default function Sidebar() {
  return (
    <aside className="w-64 p-4 m-2.5 bg-neutral-900 rounded-lg">
      <h2 className="font-bold text-2xl mb-4 ">
        RAG Chats
      </h2>

      <button className="w-full px-4 py-2 bg-yellow-400 text-neutral-900 rounded-full outline-0 ">
        + New Chat
      </button>
    </aside>
  );
}