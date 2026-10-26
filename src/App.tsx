
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Menu,
  ShieldCheck,
  LogOut,
  ArrowLeft,
} from "lucide-react";

import Sidebar from "./components/Sidebar";
import LanguageSwitcher from "./components/LanguageSwitcher";

import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Tables from "./pages/Tables";
import Reservations from "./pages/Reservations";
import Products from "./pages/Products";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import LandingPage from "./pages/LandingPage";

import type { Page } from "./types";

import {
  authenticate,
  isJwtExpired,
  type AuthUser,
} from "./api/auth";

type Session = {
  token: string;
  user: AuthUser;
};

const SESSION_KEY = "restaurantos_dev_session";

function loadSavedSession(): Session | null {
  if (!import.meta.env.DEV) return null;

  try {
    const saved = sessionStorage.getItem(SESSION_KEY);

    if (!saved) return null;

    const parsed: unknown = JSON.parse(saved);

    if (typeof parsed !== "object" || parsed === null) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }

    const data = parsed as Partial<Session>;

    if (
      typeof data.token !== "string" ||
      typeof data.user !== "object" ||
      data.user === null ||
      !Array.isArray(data.user.roles) ||
      !data.user.roles.includes("Admin") ||
      isJwtExpired(data.token)
    ) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }

    return data as Session;
  } catch {
    return null;
  }
}

function saveSession(session: Session) {
  if (!import.meta.env.DEV) return;

  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify(session)
    );
  } catch {
    console.warn("Could not save development session.");
  }
}

function clearSavedSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    console.warn("Could not clear saved session.");
  }
}

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");

  const [mobileOpen, setMobileOpen] = useState(false);

  const [showLanding, setShowLanding] = useState(true);

  const [session, setSession] = useState<Session | null>(
    loadSavedSession
  );

  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang =
      i18n.resolvedLanguage ?? "ka";
  }, [i18n.resolvedLanguage]);

  const handleLogin = async (
    email: string,
    password: string
  ) => {
    const authenticated = await authenticate(
      email,
      password
    );

    saveSession(authenticated);

    setSession(authenticated);
    setPage("dashboard");
    setMobileOpen(false);
    setShowLanding(false);
  };

  const handleLogout = () => {
    clearSavedSession();

    setSession(null);
    setPage("dashboard");
    setMobileOpen(false);
    setShowLanding(true);
  };

  const handleShowLogin = () => {
    setShowLanding(false);
  };

  const handleBackToLanding = () => {
    setShowLanding(true);
  };

  if (!session && showLanding) {
    return (
      <LandingPage
        onSignIn={handleShowLogin}
      />
    );
  }

  if (!session) {
    return (
      <>
        <button
          type="button"
          onClick={handleBackToLanding}
          className="fixed left-4 top-4 z-50 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={17} />
          Back to Home
        </button>

        <Login onLogin={handleLogin} />
      </>
    );
  }

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return (
          <Dashboard
            token={session.token}
            onNavigate={setPage}
          />
        );

      case "orders":
        return <Orders token={session.token} />;

      case "tables":
        return <Tables token={session.token} />;

      case "reservations":
        return <Reservations token={session.token} />;

      case "products":
        return <Products token={session.token} />;

      case "analytics":
        return <Analytics token={session.token} />;

      case "settings":
        return <Settings />;

      default:
        return (
          <Dashboard
            token={session.token}
            onNavigate={setPage}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fc] lg:flex">
      <Sidebar
        page={page}
        onNavigate={setPage}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-18.75 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border border-slate-200 p-2 text-slate-700 lg:hidden"
              aria-label={t("header.openMenu")}
            >
              <Menu size={21} />
            </button>

            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-800 sm:text-base">
                {t("header.restaurant")}
              </div>

              <div className="hidden text-xs text-slate-500 sm:block">
                {t("header.subtitle")}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <LanguageSwitcher />

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            <Bell
              size={19}
              className="hidden text-slate-500 sm:block"
              aria-hidden="true"
            />

            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700"
              aria-label={t("header.role")}
            >
              A
            </div>

            <div className="hidden lg:block">
              <div className="max-w-40 truncate text-xs font-bold text-slate-800">
                {session.user.firstName ||
                  session.user.email}
              </div>

              <div className="text-[11px] text-slate-500">
                {t("header.role")}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title={t("auth.logout")}
              aria-label={t("auth.logout")}
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-red-600"
            >
              <LogOut size={19} />
            </button>
          </div>
        </header>

        <div className="border-b border-blue-100 bg-blue-50 px-4 py-2.5 text-xs font-medium text-blue-700 sm:px-6 lg:px-9">
          <div className="flex items-center gap-2">
            <ShieldCheck
              size={15}
              className="shrink-0"
              aria-hidden="true"
            />

            <span>{t("tables.partialLive")}</span>
          </div>
        </div>

        <main className="mx-auto w-full max-w-[1600px] min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-9 lg:py-9">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
