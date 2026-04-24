import ChatInterface from "@/components/chat/ChatInterface";

export const metadata = {
  title: "Consultant juridique IA — CompliAI",
};

export default function ChatPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-7.75rem)] -mt-8 -mx-6 px-0">
      <ChatInterface />
    </div>
  );
}
