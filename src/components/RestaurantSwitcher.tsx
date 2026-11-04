
import { Building2, RefreshCw } from "lucide-react";

import {
  getRestaurantRoleName,
  type RestaurantSummary,
} from "../api/restaurants";

type RestaurantSwitcherProps = {
  restaurants: RestaurantSummary[];
  selectedRestaurantId: string;
  loading: boolean;
  error: string | null;
  onChange: (restaurantId: string) => void;
  onRetry: () => void;
};

export default function RestaurantSwitcher({
  restaurants,
  selectedRestaurantId,
  loading,
  error,
  onChange,
  onRetry,
}: RestaurantSwitcherProps) {
  const selectedRestaurant = restaurants.find(
    (restaurant) =>
      restaurant.id === selectedRestaurantId
  );

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-red-600 sm:block">
          Could not load restaurants
        </span>

        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
        <Building2 size={19} />
      </div>

      <div className="min-w-0">
        <label
          htmlFor="restaurant-switcher"
          className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
        >
          Active Restaurant
        </label>

        <select
          id="restaurant-switcher"
          value={selectedRestaurantId}
          onChange={(event) =>
            onChange(event.target.value)
          }
          disabled={
            loading || restaurants.length === 0
          }
          className="mt-0.5 w-38 max-w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-52"
        >
          {loading ? (
            <option value="">Loading...</option>
          ) : restaurants.length === 0 ? (
            <option value="">No restaurants</option>
          ) : (
            <>
              <option value="" disabled>
                Select restaurant
              </option>

              {restaurants.map((restaurant) => (
                <option
                  key={restaurant.id}
                  value={restaurant.id}
                  disabled={!restaurant.isActive}
                >
                  {restaurant.name}
                  {!restaurant.isActive
                    ? " (Inactive)"
                    : ""}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      {selectedRestaurant && (
        <div className="hidden flex-col gap-0.5 xl:flex">
          <span className="text-[11px] font-bold text-slate-700">
            {getRestaurantRoleName(
              selectedRestaurant.role
            )}
          </span>

          <span className="max-w-32 truncate text-[10px] text-slate-400">
            {selectedRestaurant.code}
          </span>
        </div>
      )}
    </div>
  );
}
