const CONFIG = {
    lat: 57.048,
    lon: 9.941,
    stationId: 20567,
    timezone: "Europe/Copenhagen",
    locale: navigator.language || "da-DK",
    multipliers: [
        // must be sorted by direction ascending
        // must have multiplier at 0 and 360
        // d: from direction
        // v: value
        { d: 0, v: 0.9 },
        { d: 80, v: 0.6 },
        { d: 135, v: 0.35 },
        { d: 180, v: 0.3 },
        { d: 240, v: 0.5 },
        { d: 300, v: 0.75 },
        { d: 360, v: 0.9 },
    ],
}
console.assert(
    CONFIG.multipliers.every((val, i, arr) => i == 0 || val.d >= arr[i - 1].d),
    "CONFIG.multipliers must be sorted by direction."
);
console.assert(
    CONFIG.multipliers[0].d === 0 && CONFIG.multipliers[CONFIG.multipliers.length - 1].d === 360,
    "CONFIG.multipliers must have multiplier at d: 0 and d: 360"
);

const DATA_SOURCES = {
    weather: `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${CONFIG.lat}&lon=${CONFIG.lon}`,
    waterTemp: `https://opendataapi.dmi.dk/v2/oceanObs/collections/observation/items?limit=1&parameterId=tw&stationId=${CONFIG.stationId}`
}

const FORMATTERS = {
    hour: new Intl.DateTimeFormat(CONFIG.locale, { hour: "2-digit", hour12: false, timeZone: CONFIG.timezone }),
    day: new Intl.DateTimeFormat(CONFIG.locale, { day: "numeric", timeZone: CONFIG.timezone }),
    fullDate: new Intl.DateTimeFormat(CONFIG.locale, { weekday: 'long', day: 'numeric', month: 'numeric', timeZone: CONFIG.timezone })
};

const getLocalHour = (date) => parseInt(FORMATTERS.hour.format(date));

const getLocalDay = (date) => parseInt(FORMATTERS.day.format(date));

const getMultiplier = (direction) => {
    const m = CONFIG.multipliers;
    for (let i = 0; i < m.length - 1; i++) {
        if (direction >= m[i].d && direction <= m[i + 1].d) {
            const t = (direction - m[i].d) / (m[i + 1].d - m[i].d);
            return m[i].v + (m[i + 1].v - m[i].v) * t;
        }
    }
    return m[0].v;
};



class WeatherService {
    static async fetchWeather() {
        return fetch(DATA_SOURCES.weather).then(res => res.json());
    }

    static async fetchWaterTemp() {
        return fetch(DATA_SOURCES.waterTemp).then(res => res.json());
    }

    static processForecast(wData) {
        const timeseries = wData.properties.timeseries;

        const now = new Date();
        const currentLocalHour = getLocalHour(now);
        const currentLocalDay = getLocalDay(now);

        const days = [];
        let currentDay = [];

        for (const item of timeseries) {
            const time = new Date(item.time);
            const localHour = getLocalHour(time);
            const localDay = getLocalDay(time);

            // filter past hours and night hours
            if (localDay === currentLocalDay && localHour < currentLocalHour) continue;
            if (localHour < 6 || localHour > 22) continue;

            const rain = item.data.next_1_hours?.details?.precipitation_amount ??
                (item.data.next_6_hours?.details?.precipitation_amount / 6.0) ?? 0;

            const details = item.data.instant.details;
            const hour = new ForecastHour(
                time,
                details.air_temperature,
                details.wind_speed,
                details.wind_from_direction,
                rain
            );

            if (currentDay.length > 0 && localDay !== getLocalDay(currentDay[0].time)) {
                days.push(currentDay);
                currentDay = [];
            }
            currentDay.push(hour);
        }

        if (currentDay.length) days.push(currentDay);

        return days;
    }
}

class UI {
    static setSunTimes() {
        const times = SunCalc.getTimes(new Date(), CONFIG.lat, CONFIG.lon);
        const sunriseStr = `${times.sunrise.getHours()}:${times.sunrise.getMinutes().toString().padStart(2, 0)}`;
        const sunsetStr = `${times.sunset.getHours()}:${times.sunset.getMinutes().toString().padStart(2, 0)}`;

        document.getElementById("sunrise").textContent = sunriseStr;
        document.getElementById("sunrise").classList.add("transition-no-transform");

        document.getElementById("sunset").textContent = sunsetStr;
        document.getElementById("sunset").classList.add("transition-no-transform");
    }

    static #getRainIcon(rain) {
        if (rain <= 0.1) return '';
        const level = rain < 0.5 ? 'low' : rain < 1.0 ? 'mid' : 'high';
        return `<img src="imgs/rain_${level}.png" style="height:20px; margin-left:10px; margin-bottom:-5px;">`;
    }

    static getScoreColor(score) {
        switch (score) {
            case 0:
                return "#32961f";
            case 1:
                return "#32961f";
            case 2:
                return "#559e1f";
            case 3:
                return "#7ba61f";
            case 4:
                return "#a6ad20";
            case 5:
                return "#b59620";
            case 6:
                return "#be731f";
            case 7:
                return "#c64b1f";
            default:
                return "#ce1f1f";
        }
    }

    static setWaterTemp(temp) {
        const el = document.getElementById("watertemp");
        el.classList.remove("spinner");
        el.innerHTML = Math.round(temp) + "°";
        el.classList.add("transition-no-transform");
    }

    static setWaterTempError(e) {
        const el = document.getElementById("watertemp");
        el.classList.remove("spinner");
        el.innerHTML = "&#9888;";
        el.classList.add("error");
        el.classList.add("transition-no-transform");
        const status = document.getElementById("status-messages");
        status.innerHTML += `<code>water temperature: ${e}</code>`;
    }

    static createDayTable(day, index) {
        const container = document.createElement("div");
        container.className = "transition";
        container.style.animationDelay = `${index * 0.2}s`;

        const title = FORMATTERS.fullDate.format(day[0].time).replace('.', '/');

        container.innerHTML = `
            <h4 style="margin-bottom: 5px; text-transform: capitalize;">${title}</h4>
            <table>
                <thead>
                    <tr><th>Time</th><th>Temp &degC</th><th>Vind m/s</th><th>Score</th></tr>
                </thead>
                <tbody>
                    ${day.map(h => `
                        <tr>
                            <td>${getLocalHour(h.time).toString().padStart(2, '0')}</td>
                            <td>${Math.round(h.temp)}° ${this.#getRainIcon(h.rain)}</td>
                            <td>
                                <span class="wind-span">${Math.round(h.wind)}</span>
                                <img src="imgs/arrow_lowres.png" style="transform: rotate(${h.toDirection}deg); height:20px; margin-left:10px;">
                            </td>
                            <td style="color: ${this.getScoreColor(h.score)}; font-weight: bold;">${h.score}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        return container;
    }

    static setYrError(e) {
        const tableDiv = document.getElementById("tableDiv");
        tableDiv.innerHTML = `<p>&#9888;</p></p>Kan ikke hente vejrdata fra yr.no :(</p>`;
        tableDiv.className = "transition";
        tableDiv.classList.add("error");
        tableDiv.style.textAlign = "center";
        tableDiv.style.fontSize = "xx-large";
        document.getElementById("footer").className = "transition";
        const status = document.getElementById("status-messages");
        status.innerHTML += `<code>weather: ${e}</code>`;
    }
}


class ForecastHour {
    constructor(time, temp, wind, direction, rain) {
        this.time = time;
        this.temp = temp;
        this.wind = wind;
        this.rain = rain
        this.fromDirection = direction;
        this.toDirection = (direction + 180) % 360;
        this.score = calcButter(wind, direction);
    }
}

function calcButter(wind, direction) {
    const score = wind * getMultiplier(Math.round(direction));
    return Math.round(score);
}



async function init() {
    UI.setSunTimes();

    WeatherService.fetchWaterTemp()
        .then(data => UI.setWaterTemp(data.features[0].properties.value))
        .catch((e) => UI.setWaterTempError(e));

    WeatherService.fetchWeather()
        .then(data => WeatherService.processForecast(data))
        .then(forecast => {
            const fragment = document.createDocumentFragment();
            forecast.forEach((day, i) => {
                fragment.appendChild(UI.createDayTable(day, i));
            });
            document.getElementById("tableDiv").appendChild(fragment);

            document.getElementById("footer").className = "transition";
        })
        .catch((e) => UI.setYrError(e))
}

init();