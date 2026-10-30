// Score dimensions and amenities. Plain data so the build-time prerender (seo/prerender.ts) can use it too.
export const DIMS: [string, string, string][] = [
  ["price", "Price", "How cheap it is next to every other home here and in its country"],
  ["value", "Price per m²", "How little you pay per square metre"],
  ["space", "Space", "Size of the house"],
  ["condition", "Move-in condition", "Renovated or ready to live in scores more; homes that need work score less"],
  ["extras", "Extras", "Garden, terrace, pool, sauna, fireplace, views, land and more"],
  ["water", "Sea & lakes", "How close it is to the sea or a lake"],
  ["weather", "Good weather", "Good-weather days a year where the home is: a high of 18–33 °C, dry, light wind (climate normals)"],
  ["access", "Airport", "Nearest airport with scheduled flights: 20 km or less scores 100, then it drops evenly to 0 at 200 km or more"],
  ["costs", "Buying costs", "Taxes and fees to buy in this country: lower scores more"],
  ["photos", "Listing detail", "Photos, size and rooms published, verified by us"],
  ["interest", "Buyer interest", "Views and saves from RealHunt buyers"],
];
export const AMEN: [string, string][] = [["garden", "Garden"], ["terrace", "Terrace"], ["pool", "Pool"], ["sauna", "Sauna"], ["fireplace", "Fireplace"], ["views", "Views"], ["land", "Land"], ["garage", "Garage"], ["outbuildings", "Outbuildings"], ["cellar", "Cellar or attic"], ["water", "By the water"]];
