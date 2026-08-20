export type Weather = {
  city: string;
  tempC: number;
  feelsLikeC: number;
  windKmh: number;
  condition: string;
  dateStr: string;
};

const CITY_ALIASES: Record<string, string> = {
  lahore: "Lahore",
  karachi: "Karachi",
  islamabad: "Islamabad",
  rawalpindi: "Rawalpindi",
  peshawar: "Peshawar",
  quetta: "Quetta",
  multan: "Multan",
  faisalabad: "Faisalabad",
  deutschland: "Berlin",
};

function extractCity(query: string): string {
  const lower = query.toLowerCase();
  for (const [alias, name] of Object.entries(CITY_ALIASES)) {
    if (lower.includes(alias)) return name;
  }
  const m = query.match(/(?:in|of|for|at|par|mein|ka|ki|ke)\s+([A-Za-z]{2,20})\b/i);
  if (m) return m[1].replace(/^\w/, (c) => c.toUpperCase());
  return "Islamabad";
}

export async function getWeather(query: string): Promise<Weather | null> {
  const city = extractCity(query);
  try {
    const geo = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        city
      )}&count=1&language=en`
    );
    if (!geo.ok) return null;
    const geoData = await geo.json();
    const loc = geoData.results?.[0];
    if (!loc) return null;

    const forecast = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true&timezone=auto`
    );
    if (!forecast.ok) return null;
    const f = await forecast.json();
    const cw = f.current_weather ?? {};
    const desc = (cw.weathercode ?? 0) as number;
    const map: Record<number, string> = {
      0: "Clear sky",
      1: "Mostly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Fog",
      51: "Light drizzle",
      61: "Light rain",
      63: "Rain",
      65: "Heavy rain",
      71: "Light snow",
      73: "Snow",
      80: "Rain showers",
      95: "Thunderstorm",
    };

    return {
      city: loc.name,
      tempC: cw.temperature,
      feelsLikeC: cw.apparent_temperature ?? cw.temperature,
      windKmh: cw.windspeed,
      condition: map[desc] ?? "Unknown",
      dateStr: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    };
  } catch (err) {
    console.error("Weather error:", err);
    return null;
  }
}