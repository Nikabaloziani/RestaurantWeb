import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Menu,
  ShieldAlert,
  LogOut,
  ArrowLeft,
} from "lucide-react";

import Sidebar from "./components/Sidebar";
import LanguageSwitcher from "./components/LanguageSwitcher";
import RestaurantSwitcher from "./components/RestaurantSwitcher";

import Dashboard from "./pages/Dashboard";
import OperationalDashboard from "./pages/OperationalDashboard";
import Orders from "./pages/Orders";
import Tables from "./pages/Tables";
import Reservations from "./pages/Reservations";
import Products from "./pages/Products";
import Analytics from "./pages/Analytics";
import Staff from "./pages/Staff";
import Settings from "./pages/Settings";
import BillingSettings from "./pages/BillingSettings";
import Login from "./pages/Login";
import LandingPage from "./pages/LandingPage";
import WorkspaceSetup from "./pages/WorkspaceSetup";

import type { Page } from "./types";
import { canOpenPage, localizedRestaurantRole, restaurantRoleOf } from "./auth/restaurantAccess";

import {
  authenticate,
  isJwtExpired,
  type AuthUser,
} from "./api/auth";

import {
  getMyRestaurants,
  type RestaurantSummary,
} from "./api/restaurants";

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

    if (
      typeof parsed !== "object" ||
      parsed === null
    ) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }

    const data = parsed as Partial<Session>;

    if (
      typeof data.token !== "string" ||
      typeof data.user !== "object" ||
      data.user === null ||
      !Array.isArray(data.user.roles) ||
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

  const [authMode, setAuthMode] =
    useState<"login" | "register">("login");

  const [session, setSession] = useState<Session | null>(
    loadSavedSession
  );

  const [restaurants, setRestaurants] = useState<
    RestaurantSummary[]
  >([]);

  const [
    selectedRestaurantId,
    setSelectedRestaurantId,
  ] = useState("");

  const [
    restaurantsLoading,
    setRestaurantsLoading,
  ] = useState(Boolean(session));

  const [
    restaurantsError,
    setRestaurantsError,
  ] = useState<string | null>(null);

  const [
    restaurantsReloadKey,
    setRestaurantsReloadKey,
  ] = useState(0);

  const { t, i18n } = useTranslation();

  const token = session?.token;

  const selectedRestaurant = restaurants.find(
    (restaurant) =>
      restaurant.id === selectedRestaurantId &&
      restaurant.isActive
  );

  // Role comes from restaurant membership, NOT the global Identity Admin role.
  const restaurantRole = restaurantRoleOf(selectedRestaurant?.role);
  const roleLabel = localizedRestaurantRole(restaurantRole, i18n.resolvedLanguage ?? i18n.language ?? 'en');
  const activePage = canOpenPage(restaurantRole, page) ? page : 'dashboard';
  const handleNavigate = (nextPage: Page) => {
    if (canOpenPage(restaurantRole, nextPage)) setPage(nextPage);
  };

  useEffect(() => {
    document.documentElement.lang =
      i18n.resolvedLanguage ?? "ka";
  }, [i18n.resolvedLanguage]);

  useEffect(() => {
    if (!token) {
      setRestaurants([]);
      setSelectedRestaurantId("");
      setRestaurantsLoading(false);
      setRestaurantsError(null);
      return;
    }

    const controller = new AbortController();

    setRestaurantsLoading(true);
    setRestaurantsError(null);

    getMyRestaurants(token, controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return;

        setRestaurants(items);

        setSelectedRestaurantId((currentId) => {
          const activeRestaurants = items.filter(
            (restaurant) => restaurant.isActive
          );

          const currentIsValid = activeRestaurants.some(
            (restaurant) =>
              restaurant.id === currentId
          );

          if (currentIsValid) {
            return currentId;
          }

          return activeRestaurants[0]?.id ?? "";
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setRestaurants([]);
        setSelectedRestaurantId("");

        setRestaurantsError(
          error instanceof Error
            ? error.message
            : "Could not load restaurants."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setRestaurantsLoading(false);
        }
      });

    return () => controller.abort();
  }, [token, restaurantsReloadKey]);

  const handleLogin = async (
    email: string,
    password: string
  ) => {
    const authenticated = await authenticate(
      email,
      password
    );

    saveSession(authenticated);

    setRestaurantsLoading(true);
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

    setRestaurants([]);
    setSelectedRestaurantId("");
    setRestaurantsError(null);
  };

  const handleRestaurantChange = (
    restaurantId: string
  ) => {
    const restaurant = restaurants.find(
      (item) =>
        item.id === restaurantId &&
        item.isActive
    );

    if (!restaurant) return;

    setSelectedRestaurantId(restaurant.id);
    setPage("dashboard");
    setMobileOpen(false);
  };

  const handleReloadRestaurants = () => {
    setRestaurantsLoading(true);
    setRestaurantsReloadKey((current) => current + 1);
  };

  if (!session && showLanding) {
    return (
      <LandingPage
        onSignIn={() => {
          setAuthMode("login");
          setShowLanding(false);
        }}
        onRegister={() => {
          setAuthMode("register");
          setShowLanding(false);
        }}
      />
    );
  }

  if (!session) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowLanding(true)}
          className="fixed left-4 top-4 z-50 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={17} />
          {t('onboarding.backHome')}
        </button>

        <Login
          key={authMode}
          onLogin={handleLogin}
          initialMode={authMode}
        />      </>
    );
  }


  if (!selectedRestaurantId) {
    return (
      <WorkspaceSetup
        key={session.user.id}
        token={session.token}
        email={session.user.email}
        loading={restaurantsLoading}
        accessError={Boolean(restaurantsError)}
        onRefresh={handleReloadRestaurants}
        onLogout={handleLogout}
      />
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        // Staff never mounts the financial Dashboard/useInsights component.
        if (restaurantRole === 'waiter' || restaurantRole === 'cashier') {
          return (
            <OperationalDashboard
              key={selectedRestaurantId}
              token={session.token}
              restaurantId={selectedRestaurantId}
              role={restaurantRole}
              onNavigate={handleNavigate}
            />
          );
        }
        if (restaurantRole !== 'owner' && restaurantRole !== 'manager') {
          return <div className="rounded-xl border bg-white p-5">You do not have an assigned restaurant role.</div>;
        }
        return (
          <Dashboard
            key={selectedRestaurantId}
            token={session.token}
            restaurantId={selectedRestaurantId}
            onNavigate={handleNavigate}
          />
        );




      case "orders":
        return (
          <Orders
            key={selectedRestaurantId}
            token={session.token}
            restaurantId={selectedRestaurantId}
            restaurantRole={restaurantRole}
          />
        );


      case "tables":
        return (
          <Tables
            key={selectedRestaurantId}
            token={session.token}
            restaurantId={selectedRestaurantId}
            restaurantRole={restaurantRole}
          />
        );


      case "reservations":
        return (
          <Reservations
            key={selectedRestaurantId}
            token={session.token}
            restaurantId={selectedRestaurantId}
          />
        );


      case "products":
        return (
          <Products
            key={selectedRestaurantId}
            token={session.token}
            restaurantId={selectedRestaurantId}
          />
        );



      case "analytics":
        return (
          <Analytics
            key={selectedRestaurantId}
            token={session.token}
            restaurantId={selectedRestaurantId}
          />
        );

      case "staff":
        return (
          <Staff
            key={selectedRestaurantId}
            token={session.token}
            restaurantId={selectedRestaurantId}
          />
        );

      case "settings":
        return (
          <div className="space-y-10">
            {restaurantRole === 'owner' && <BillingSettings token={session.token} />}
            <Settings
              key={`${session.user.id}:${selectedRestaurantId}`}
              token={session.token}
              restaurantId={selectedRestaurantId}
              restaurantRole={restaurantRole}
              onRestaurantAccessChanged={handleReloadRestaurants}
            />
          </div>
        );

      default:
        return <div className="rounded-xl border bg-white p-5">Page unavailable for this role.</div>;
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fc] lg:flex">
      <Sidebar
        page={activePage}
        onNavigate={handleNavigate}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        restaurantRole={restaurantRole}
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
                {selectedRestaurant?.name ??
                  "Select Restaurant"}
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
              {roleLabel.slice(0, 1).toUpperCase()}
            </div>

            <div className="hidden lg:block">
              <div className="max-w-40 truncate text-xs font-bold text-slate-800">
                {session.user.firstName ||
                  session.user.email}
              </div>

              <div className="text-[11px] text-slate-500">
                {roleLabel}
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

        <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <RestaurantSwitcher
              restaurants={restaurants}
              selectedRestaurantId={
                selectedRestaurantId
              }
              loading={restaurantsLoading}
              error={restaurantsError}
              onChange={handleRestaurantChange}
              onRetry={handleReloadRestaurants}
            />

            {selectedRestaurant && (
              <span className="text-xs font-medium text-slate-500">
                {selectedRestaurant.code}
              </span>
            )}
          </div>
        </div>

        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800 sm:px-6 lg:px-9">
          <div className="flex items-start gap-2">
            <ShieldAlert
              size={16}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />

            <span>
              SaaS subscription setup is in progress.
              Plans, trial periods and location attachment are available;
              automatic upgrades and recurring payments are not connected yet.
            </span>
          </div>
        </div>

        {restaurantsError && (
          <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700 sm:px-6 lg:px-9">
            {restaurantsError}
          </div>
        )}

        {!restaurantsLoading &&
          !restaurantsError &&
          restaurants.length === 0 && (
            <div className="border-b border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 sm:px-6 lg:px-9">
              No restaurants are linked to this account yet.
            </div>
          )}

        <main className="mx-auto w-full max-w-[1600px] min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-9 lg:py-9">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
