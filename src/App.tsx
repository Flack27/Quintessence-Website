import { Route, Routes } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BackToTopButton } from "@/components/BackToTopButton";
import { HomePage } from "@/pages/HomePage";
import { PostPage } from "@/pages/PostPage";
import { PublishPage } from "@/pages/PublishPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { AuthProvider } from "@/lib/AuthContext";
import { PUBLISHING_ENABLED } from "@/lib/config";

export default function App() {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/guide/:slug" element={<PostPage />} />
            {/* PUBLISHING_ENABLED stays false in production per lib/config.ts — the DEV
                clause only keeps the route reachable for local `npm run dev` testing. */}
            {(PUBLISHING_ENABLED || import.meta.env.DEV) && <Route path="/publish" element={<PublishPage />} />}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
        <BackToTopButton />
      </div>
    </AuthProvider>
  );
}
