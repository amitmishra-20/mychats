import ChatWindow from "@/compnents/chat/chatwindow";
import Sidebar from "@/compnents/chat/sidebar";


export default function Home() {
  return (
    <main className="h-screen flex bg-neutral-700 ">
      <Sidebar/>
      <ChatWindow />
    </main>
  );
}