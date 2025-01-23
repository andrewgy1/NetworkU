'use client'

import { useEffect, useState, useRef } from 'react';
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
      content: "Hi! I am NetworkU, a tool by RecruitU to help you network with Investment Banking and Consulting professionals. I can connect you with the right people to coffee chat, suggest cold email ideas, or answer questions about the networking process!",
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [showChat, setShowChat] = useState(false); 
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

    // Scroll to the bottom of the chat when chatHistory changes
    useEffect(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, [chatHistory]);

  // Show chat after logo animation finishes
  useEffect(() => {
    const chatTimer = setTimeout(() => {
      setShowChat(true);
    }, 3500);

    return () => {
      clearTimeout(chatTimer);
    };
  }, []);

  // Handle user sending messages
  const handleSend = async () => {
    if (inputValue.trim() !== '') {
      const updatedChatHistory: Message[] = [...chatHistory, { role: 'user', content: inputValue }];
      setChatHistory(updatedChatHistory);
      setInputValue('');
      setIsLoading(true);
      setIsTyping(true);
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

        // Get the streamed content
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let streamedContent = '';
        setIsLoading(false);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          streamedContent += chunk;

          // Update the chat as the stream progresses
          setChatHistory((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'system') {
              return [
                ...prev.slice(0, -1),
                { role: 'system', content: streamedContent },
              ];
            } else {
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
      }
      setIsTyping(false);
    }
  };    
 return (
  <>
      {!showChat ? (
        // Logo animation
         <Logo />
      ) : (
          <div className="flex flex-col h-screen bg-gray-100">
            <Header />
            {/* Chat messages area */}
            <div 
              className="flex-1 overflow-y-auto p-4"
              ref={chatContainerRef}
            >
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
                      whiteSpace: "pre-line",
                      wordWrap: "break-word",
                      wordBreak: "break-word",
                      margin: "5px",
                      fontFamily: "sans-serif",
                      maxWidth: "90%", 
                      overflow: "hidden", 
                    }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="chat chat-start">
                  <div
                    className="chat-bubble bg-recruituBlue text-white flex justify-center items-center"
                    style={{
                      minHeight: '40px',
                      maxWidth: '90%',
                    }}
                  >
                    <span className="loading loading-dots loading-sm"></span>
                  </div>
                </div>
              )}
            </div>
            {/* Input box */}
            <div className="border-t bg-white p-3 flex items-center">
              <input
                type="text"
                placeholder="Message NetworkU"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
                className="flex-1 input input-bordered text-black bg-white"
              />
              {/* Send buttons */}
              {!isTyping && (
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
              )}
              {isTyping && (
                <button
                className="ml-2 text-white p-2 rounded-full  bg-hoverBlue"
                >
                  <Image
                    src="/typing.svg"
                    alt="Send"
                    width={20}
                    height={20}
                  />
                </button>)}
            </div>
          </div>
      )}
    </>
  );
}
