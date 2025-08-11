import React from "react";
import Header from "./Header";
import ImportFromSheet from "./ImportFromSheet";

export default function AdminLayout({ children }) {
  const handleImport = () => {
    document.getElementById("importBtn")?.click();
  };

  return (
    <div
      className="min-h-screen text-white flex-1"
      style={{
        backgroundImage: 'url("/space_background.jpg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Header onImport={handleImport} />
      <ImportFromSheet hiddenTrigger />
      
      <main className="pt-20">
        {children}
      </main>
    </div>
  );
}
