"use client";

import { useState } from "react";

interface MessageInputProps {
  onSend: (text: string) => void;
  onStop:()=>void;
  isLoading: boolean;
}

export default function MessageInput({
  onSend, onStop, isLoading
}: MessageInputProps) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;

    onSend(text);

    setText("");
  };

  const handleKeyDown=(
    e: React.KeyboardEvent<HTMLInputElement>
  )=>{
    if(e.key==='Enter'){
        handleSend()
    }
  }

  const handleStop = () => {
    onStop()
};
  
  return (
    <div className="flex gap-2 rounded-full bg-neutral-800 p-2.5 w-[90%] mb-2.5">
      <input
        value={text}
        onChange={(e) =>
            setText(e.target.value)
        }
        onKeyDown={handleKeyDown}
        className="flex-1 p-2 border-0 outline-0"
        placeholder="Type a message..."
      />
      <button
        onClick={isLoading?handleStop:handleSend}
        className="px-4 py-2 bg-yellow-400 text-neutral-900 rounded-full min-w-30"
      >
        {isLoading?"Stop":"Send"}
      </button>
    </div>
  );
}