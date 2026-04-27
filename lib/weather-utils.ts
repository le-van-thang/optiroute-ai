export const getWeatherIcon = (code: number, isDay: boolean = true) => {
  if (code === 0) return isDay ? "☀️" : "🌙";
  if (code <= 3) return isDay ? "⛅" : "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 95 && code <= 99) return "⛈️";
  return "☁️";
};

export const getWeatherDescription = (code: number, lang: string = "vi") => {
  const descriptions: Record<number, { vi: string, en: string }> = {
    0: { vi: "Trời quang", en: "Clear sky" },
    1: { vi: "Phần lớn quang đãng", en: "Mainly clear" },
    2: { vi: "Có mây rải rác", en: "Partly cloudy" },
    3: { vi: "U ám", en: "Overcast" },
    45: { vi: "Sương mù", en: "Fog" },
    48: { vi: "Sương muối", en: "Depositing rime fog" },
    51: { vi: "Mưa phùn nhẹ", en: "Light drizzle" },
    53: { vi: "Mưa phùn vừa", en: "Moderate drizzle" },
    55: { vi: "Mưa phùn dày", en: "Dense drizzle" },
    61: { vi: "Mưa nhẹ", en: "Slight rain" },
    63: { vi: "Mưa vừa", en: "Moderate rain" },
    65: { vi: "Mưa to", en: "Heavy rain" },
    80: { vi: "Mưa rào nhẹ", en: "Slight rain showers" },
    81: { vi: "Mưa rào vừa", en: "Moderate rain showers" },
    82: { vi: "Mưa rào rất to", en: "Violent rain showers" },
    95: { vi: "Dông nhẹ", en: "Slight thunderstorm" },
    96: { vi: "Dông kèm mưa đá", en: "Thunderstorm with slight hail" },
    99: { vi: "Dông mạnh kèm mưa đá", en: "Thunderstorm with heavy hail" },
  };
  
  const desc = descriptions[code] || { vi: "Nhiều mây", en: "Cloudy" };
  return lang === "vi" ? desc.vi : desc.en;
};

export const getWindDirection = (degree: number) => {
  const directions = ["B", "BĐB", "ĐB", "ĐĐB", "Đ", "ĐNĐ", "ĐN", "NĐN", "N", "NTN", "TN", "TTN", "T", "TTB", "TB", "BTB"];
  const index = Math.round(degree / 22.5) % 16;
  return directions[index];
};
