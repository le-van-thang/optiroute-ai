/**
 * OptiRoute AI - Smart Weather Service
 * Uses Open-Meteo (Free, No API Key required)
 */

interface WeatherResult {
  hasData: boolean;
  forecastString: string;
  rawForecast?: any;
  error?: string;
}

// Map WMO Weather codes to readable Vietnamese descriptions
function getWeatherDescription(code: number): string {
  if (code === 0) return "Trời quang mây tạnh, nắng đẹp";
  if (code === 1 || code === 2 || code === 3) return "Nhiều mây, có nắng nhẹ";
  if (code === 45 || code === 48) return "Có sương mù";
  if (code >= 51 && code <= 57) return "Mưa phùn nhẹ";
  if (code >= 61 && code <= 65) return "Mưa rào (có thể mưa lớn)";
  if (code >= 66 && code <= 67) return "Mưa lạnh, thời tiết xấu";
  if (code >= 71 && code <= 77) return "Có tuyết";
  if (code >= 80 && code <= 82) return "Mưa rào nặng hạt kéo dài";
  if (code >= 95 && code <= 99) return "Mưa dông lớn, sấm sét nguy hiểm";
  return "Không rõ";
}

export async function getDestinationWeather(
  destination: string, 
  startDate: string, // YYYY-MM-DD
  endDate: string, // YYYY-MM-DD
  lat?: number,
  lng?: number
): Promise<WeatherResult> {
  try {
    let latitude = lat;
    let longitude = lng;

    // 1. Geocoding if lat/lng not provided
    if (!latitude || !longitude) {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=vi`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        return { hasData: false, forecastString: "Không tìm thấy tọa độ điểm đến." };
      }
      latitude = geoData.results[0].latitude;
      longitude = geoData.results[0].longitude;
    }

    // 2. Check if the dates are within the 16-day forecast limit
    const startObj = new Date(startDate);
    const today = new Date();
    const diffDays = Math.ceil((startObj.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (diffDays > 15) {
      return { 
        hasData: false, 
        forecastString: `Hành trình diễn ra sau ${diffDays} ngày. API thời tiết hiện tại chỉ dự báo tối đa 16 ngày tới. Vui lòng thiết kế lịch trình theo thời tiết mùa hiện tại.` 
      };
    }

    // 3. Fetch Forecast
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
    const weatherRes = await fetch(weatherUrl);
    const weatherData = await weatherRes.json();

    if (!weatherData.daily) {
       return { hasData: false, forecastString: "Không thể lấy dữ liệu thời tiết cho những ngày này." };
    }

    // 4. Format the output for the AI prompt
    let forecastSummary = `Dự báo thời tiết tại ${destination} từ ${startDate} đến ${endDate}:\n`;
    
    const daily = weatherData.daily;
    for (let i = 0; i < daily.time.length; i++) {
      const date = daily.time[i];
      const maxTemp = daily.temperature_2m_max[i];
      const rainProb = daily.precipitation_probability_max[i];
      const desc = getWeatherDescription(daily.weathercode[i]);
      
      forecastSummary += `- Ngày ${date}: ${desc}, Nhiệt độ cao nhất: ${maxTemp}°C, Xác suất mưa: ${rainProb}%.\n`;
    }

    forecastSummary += `\n[HƯỚNG DẪN DÀNH CHO AI]: Dựa vào dự báo trên, hãy xếp lịch trình cho phù hợp. Nếu xác suất mưa > 60% hoặc có Dông/Sét, hãy HỦY các hoạt động ngoài trời (biển, núi) và thay bằng các hoạt động TRONG NHÀ (Bảo tàng, Mua sắm, Cafe, Spa).`;

    return {
      hasData: true,
      forecastString: forecastSummary,
      rawForecast: weatherData.daily
    };

  } catch (error: any) {
    console.error("[Weather Service] Error:", error);
    return { hasData: false, forecastString: "Lỗi kết nối dịch vụ thời tiết." };
  }
}
