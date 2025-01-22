'use client'

import { useEffect, useState } from 'react';
import Image from "next/image";
import Logo from "./components/logo";
import Header from './components/header';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';


export type Message = {
  role: 'user' | 'system'
  content: string;
};


export default function Home() {
  const [chatHistory, setChatHistory] = useState<Message[]>([
    {
      role: "system",
      content: "Hi! I am NetworkU, a tool by RecruitU to help you network with Investment Banking and Consulting professionals. Tell me about yourself, and I can connect you with the right people to coffee chat and suggest cold emails ideas!",
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [showChat, setShowChat] = useState(false); 
  // const [isStreaming, setIsStreaming] = useState(false);


  useEffect(() => {
    const chatTimer = setTimeout(() => {
      setShowChat(true);
    }, 3500);

    return () => {
      clearTimeout(chatTimer);
    };
  }, []);

  const handleSend = async () => {
    console.log("test");
    if (inputValue.trim() !== '') {
      const updatedChatHistory: Message[] = [...chatHistory, { role: 'user', content: inputValue }];
      setChatHistory(updatedChatHistory);
      setInputValue('');
      console.log("[Debug] Frontend Chat History:", JSON.stringify(updatedChatHistory));

      try {
        // Make a POST request to the backend API
        const response = await fetch('/api', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ chatHistory: updatedChatHistory }),
        });
  
        if (!response.body) {
          throw new Error('Response body is null');
        }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let streamedContent = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
  
            const chunk = decoder.decode(value);
            streamedContent += chunk;
  
            // Update the chat as the stream progresses
            setChatHistory((prev) => {
              // Replace or append the streaming message dynamically
              const lastMessage = prev[prev.length - 1];
              if (lastMessage && lastMessage.role === 'system') {
                // Update the last system message
                return [
                  ...prev.slice(0, -1),
                  { role: 'system', content: streamedContent },
                ];
              } else {
                // Add a new system message
                return [...prev, { role: 'system', content: streamedContent }];
              }
            });
          }
        } catch (error) {
          console.error('Error making API call:', error);
          setChatHistory((prev) => [
            ...prev,
            { role: 'system', content: "Sorry, I couldn't connect to the server." },
          ]);
        } finally {
        }
      }
    };    
 return (
  <>
      {!showChat ? (
         <Logo />
      ) : (
          <div className="flex flex-col h-screen bg-gray-100">
            <Header />
            {/* Chat messages area */}
            <div className="flex-1 overflow-y-auto p-4">
              {chatHistory.map((message, index) => (
                <div
                  key={index}
                  className={`chat ${message.role === 'user' ? 'chat-end' : 'chat-start'}`}
                >
                  <div
                    className={`chat-bubble ${
                      message.role === 'user' ? 'bg-recruituLightBlue text-white' : 'bg-recruituBlue text-white'
                    }`}
                    style ={{
                      whiteSpace: "pre-line", /* Preserve newlines and spacing */
                      wordWrap: "break-word", /* Break long words */
                      wordBreak: "break-word", /* Prevent overflow for long words */
                      // padding: "10px",
                      margin: "5px 0",
                      fontFamily: "sans-serif",
                      maxWidth: "90%", /* Limit bubble width for better readability */
                      overflow: "hidden", /* Hide any accidental overflow */
                    }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
            {/* Input box */}
            <div className="border-t bg-white p-3 flex items-center">
              <input
                type="text"
                placeholder="Message NetworkU"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  console.log("Key pressed:", e.key);
                  if (e.key === 'Enter') handleSend();
                }}
                className="flex-1 input input-bordered text-black bg-white"
              />
              <button
                onClick={handleSend}
                className="ml-2 text-white p-2 rounded-full hover:bg-hoverBlue bg-recruituBlue"
              >
                <Image
                  src="/send-arrow.svg"
                  alt="Send"
                  width={20}
                  height={20}
                />
              </button>
            </div>
          </div>
      )}
    </>
  );
}
