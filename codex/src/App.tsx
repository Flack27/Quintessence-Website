import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BackToTopButton } from "@/components/BackToTopButton";
import { HomePage } from "@/pages/HomePage";
import { PostPage } from "@/pages/PostPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { AuthProvider } from "@/lib/AuthContext";
import { PUBLISHING_ENABLED } from "@/lib/config";

// Lazy: the guide editor pulls in Tiptap/ProseMirror for its WYSIWYG body editor, which
// would otherwise bloat the bundle every guide *reader* downloads for a page only editors
// ever visit.
const PublishPage = lazy(() => import("@/pages/PublishPage").then((m) => ({ default: m.PublishPage })));

export default function App() {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/guide/:slug" element={<PostPage />} />
            {/* The DEV clause keeps these reachable under `npm run dev` even if
                PUBLISHING_ENABLED is ever flipped back off locally. */}
            {(PUBLISHING_ENABLED || import.meta.env.DEV) && (
              <>
                <Route
                  path="/publish"
                  element={
                    <Suspense fallback={null}>
                      <PublishPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/publish/:slug"
                  element={
                    <Suspense fallback={null}>
                      <PublishPage />
                    </Suspense>
                  }
                />
              </>
            )}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
        <BackToTopButton />
      </div>
    </AuthProvider>
  );
}
