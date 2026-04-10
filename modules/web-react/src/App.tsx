import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppStore } from '@/store/appStore';
import BookShelf from "./pages/BookShelf";
import BookDetail from "./pages/BookDetail";
import Reader from "./pages/Reader";
import SettingsPage from "./pages/SettingsPage";
import SearchPage from "./pages/SearchPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const DarkModeProvider = ({ children }: { children: React.ReactNode }) => {
  const { darkMode } = useAppStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DarkModeProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Routes>
            <Route path="/" element={<BookShelf />} />
            <Route path="/book/:bookUrl" element={<BookDetail />} />
            <Route path="/read/:bookUrl/:chapterIndex" element={<Reader />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </DarkModeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
