import ChatInterface from "@/components/chat/ChatInterface";

export const metadata = {
  title: "Consultant juridique IA — CompliAI",
};

export default function ChatPage() {
  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <ChatInterface />
    </div>
  );
}
