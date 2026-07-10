import SiteScannerClient from "./SiteScannerClient";

export const metadata = {
  title: "Scanner conformité URL — CompliAI",
};

export default function ScannerToolPage() {
  return (
    <div className="py-4 px-4 max-w-3xl mx-auto">
      <SiteScannerClient />
    </div>
  );
}
