import ChatInterface from "@/components/chat/ChatInterface";

export const metadata = {
  title: "Consultant juridique IA — CompliAI",
};

export default function ChatPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <ChatInterface />
    </div>
  );
}
