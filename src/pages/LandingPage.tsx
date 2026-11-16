
import type { ReactNode } from "react";

type LandingPageProps = {
  onSignIn: () => void;
  onRegister: () => void;
};

const features = [
  {
    number: "01",
    title: "Order Management",
    description:
      "Create, organize and manage restaurant orders in one place.",
  },
  {
    number: "02",
    title: "Tables & Reservations",
    description:
      "Keep track of your tables, availability and guest reservations.",
  },
  {
    number: "03",
    title: "Business Analytics",
    description:
      "Understand your orders, payments and business performance.",
  },
  {
    number: "04",
    title: "Menu Management",
    description:
      "Manage your products, categories and menu prices.",
  },
];

function ActionButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500"
    >
      {children}
    </button>
  );
}

export default function LandingPage({
  onSignIn,
  onRegister,
}: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#08111f] text-white">
      <header className="border-b border-white/10">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <a href="#home" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold">
              R
            </div>

            <span className="text-xl font-bold tracking-tight">
              Restaurant<span className="text-blue-400">OS</span>
            </span>
          </a>

          <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#features" className="hover:text-white">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-white">
              How it works
            </a>
            <a href="#contact" className="hover:text-white">
              Contact
            </a>
          </div>

          <button
            type="button"
            onClick={onSignIn}
            className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium transition hover:bg-white/10"
          >
            Sign In
          </button>
        </nav>
      </header>

      <main id="home">
        <section className="relative overflow-hidden px-5 pb-24 pt-20 md:px-8 md:pt-28">
          <div className="pointer-events-none absolute left-1/2 top-10 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/15 blur-3xl" />

          <div className="relative mx-auto max-w-5xl text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-xs font-medium text-blue-300">
              A smarter way to manage your restaurant
            </div>

            <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-7xl">
              Your restaurant.
              <br />
              <span className="bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                One powerful platform.
              </span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-slate-400 md:text-lg">
              Manage orders, tables, reservations, payments and
              business insights from one modern dashboard.
              Less complexity. More control.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <ActionButton onClick={onRegister}>
                Start your free trial →
              </ActionButton>

              <a
                href="mailto:balozianinikolozi@gmail.com?subject=RestaurantOS%20Demo%20Request"
                className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Request a Demo
              </a>
            </div>

            <p className="mt-5 text-xs text-slate-500">
              Product development in progress
            </p>
          </div>

          <div className="relative mx-auto mt-20 max-w-5xl rounded-2xl border border-white/10 bg-[#111e31] p-3 shadow-2xl shadow-blue-950/30 md:p-5">
            <div className="flex items-center justify-between border-b border-white/10 px-3 pb-4">
              <span className="font-semibold">
                Restaurant<span className="text-blue-400">OS</span>
              </span>
              <span className="rounded-md bg-white/5 px-3 py-1 text-xs text-slate-400">
                Dashboard Preview
              </span>
            </div>

            <div className="grid gap-4 p-3 md:grid-cols-3">
              {[
                { label: "Orders", detail: "Order tracking" },
                { label: "Reservations", detail: "Guest management" },
                { label: "Revenue", detail: "Payment insights" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/10 bg-[#17263c] p-5"
                >
                  <p className="text-sm text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-3 text-xl font-semibold">
                    {item.detail}
                  </p>
                  <div className="mt-5 h-1.5 w-24 rounded-full bg-blue-500/60" />
                </div>
              ))}
            </div>

            <div className="mx-3 mb-3 rounded-xl border border-white/10 bg-[#17263c] p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Restaurant Overview</h3>
                <span className="text-xs text-slate-500">
                  Interface concept
                </span>
              </div>

              <div className="mt-6 flex h-28 items-end gap-3">
                {[35, 55, 42, 72, 58, 88, 68, 95, 76, 85].map(
                  (value, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-md bg-linear-to-t from-blue-700 to-blue-400"
                      style={{ height: `${value}%` }}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="border-t border-white/10 bg-[#0c1728] px-5 py-24 md:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="mb-3 font-medium text-blue-400">
                OUR FEATURES
              </p>

              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Everything you need in one place.
              </h2>

              <p className="mt-4 text-slate-400">
                Essential tools to help restaurants handle
                daily operations more efficiently.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature.number}
                  className="rounded-2xl border border-white/10 bg-[#111e31] p-7 transition hover:border-blue-500/40"
                >
                  <span className="font-mono text-sm text-blue-400">
                    {feature.number}
                  </span>

                  <h3 className="mt-5 text-xl font-semibold">
                    {feature.title}
                  </h3>

                  <p className="mt-3 leading-7 text-slate-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="px-5 py-24 md:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <p className="mb-3 font-medium text-blue-400">
                HOW IT WORKS
              </p>

              <h2 className="text-3xl font-bold md:text-4xl">
                Simple by design.
              </h2>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Create your workspace",
                  text: "Create an account, then set up your business and first restaurant.",
                },
                {
                  step: "02",
                  title: "Organize operations",
                  text: "Manage tables, menu items, orders and reservations.",
                },
                {
                  step: "03",
                  title: "Track performance",
                  text: "Review payments, sales and business reports.",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/15 text-lg font-bold text-blue-400">
                    {item.step}
                  </div>

                  <h3 className="mt-6 text-lg font-semibold">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-400">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="px-5 pb-24 md:px-8">
          <div className="mx-auto max-w-5xl rounded-3xl border border-blue-500/20 bg-linear-to-br from-[#142c50] to-[#101d31] px-6 py-16 text-center md:px-12">
            <h2 className="text-3xl font-bold md:text-4xl">
              Ready to explore RestaurantOS?
            </h2>

            <p className="mx-auto mt-5 max-w-xl leading-7 text-slate-300">
              Discover how RestaurantOS can support your
              restaurant's daily workflow.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ActionButton onClick={onRegister}>
                Start your free trial →
              </ActionButton>

              <a
                href="mailto:balozianinikolozi@gmail.com?subject=RestaurantOS%20Demo%20Request"
                className="rounded-xl border border-white/20 px-6 py-3 font-semibold transition hover:bg-white/10"
              >
                Contact Us
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-500 md:flex-row">
          <span>© {new Date().getFullYear()} RestaurantOS</span>
          <span>Built for modern restaurant operations.</span>
        </div>
      </footer>
    </div>
  );
}
