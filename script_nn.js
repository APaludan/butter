const enableNotifications = document.getElementById("enableNotifications")
registerSW();
let swRegistered = false;

enableNotifications.addEventListener("click", () => {
    registerSW();
    sendTestNoti();
})

function registerSW() {
    navigator.serviceWorker.ready.then(reg => reg.unregister).then( () => navigator.serviceWorker.removeEventListener("message", this.receiveServiceWorkerMessage));
    
    navigator.serviceWorker.register("service_worker.js")
    .then( () => {
        navigator.serviceWorker.addEventListener("message", (e) => {
            if (Notification.permission === "granted") {
                navigator.serviceWorker.ready.then((registration) => {
                    registration.showNotification(e.data)
                });
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then((permission) => {
                    if (permission === "granted") {
                        navigator.serviceWorker.ready.then((registration) => {
                            registration.showNotification(e.data)
                        });
                    }
                })
            }
    
        })
    
    })
    .then( () => swRegistered = true)
    .catch(e => alert(e));
}

/**
 * 
 * @param {[[ForecastHour]]} forecast
 */
function makeNotifications(forecast) {
    let arrayMs = [];
    let arrayDates = [];
    forecast.forEach( (day) => {
        day.forEach( hour => {
            if (hour.hour.getDKHours() == 8 || hour.hour.getDKHours() == 14 || hour.hour.getDKHours() == 20) { 
                return;
            }
            if (hour.score <= 1) {
                arrayDates.push(hour.hour)
                arrayMs.push(hour.hour.getTime() - new Date().getTime())
            }
        })
    })
    setNotiTimes(arrayMs, arrayDates)
}

function setNotiTimes(arrayMs, arrayDates) {
    navigator.serviceWorker.controller.postMessage([arrayMs, arrayDates]);
}

function sendTestNoti() {
    navigator.serviceWorker.controller.postMessage("test");
}


const useNN = window.location.href.includes("_nn.html");
let model;

class Multiplier {
    constructor(fromDirection, value) {
        this.fromDirection = fromDirection;
        this.value = value;
    }
}

Date.prototype.getDKHours = function () {
    return parseInt(this.toLocaleTimeString("da-DK", { timeZone: "Europe/Copenhagen", hour: "2-digit", hour12: false }).split(".")[0]);
}


const wUrl = "https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=57.0481&lon=9.941";
const sUrl = getSUrl();
const tUrl = "https://api.met.no/weatherapi/oceanforecast/2.0/complete?lat=56.988425&lon=10.286659";
const tableDiv = document.getElementById("tableDiv");
const windDirMultiplierArray = buildWindDirMultiplierArray();

try {
    update()
    fetch("https://ahpa.azurewebsites.net/api/counter", { method: "POST" })
} catch (error) {
    alert(error);
}

async function update() {
    let wData, sData, tData;
    if (useNN) {
        [model, wData, sData, tData] = await Promise.all([
            tf.loadLayersModel('nn/tfjs_model/model.json'),
            fetch(wUrl).then(response => response.json()),
            fetch(sUrl).then(response => response.json()),
            fetch(tUrl).then(response => response.json())]);
        tf.setBackend('cpu');
        tf.enableProdMode();
    }
    else {
        [wData, sData, tData] = await Promise.all([
            fetch(wUrl).then(response => response.json()),
            fetch(sUrl).then(response => response.json()),
            fetch(tUrl).then(response => response.json())]);
    }

    setWaterTemp(tData);

    let index = 0;

    // Skip old data
    let timeseries = wData.properties.timeseries;
    while (new Date(timeseries[index].time).getHours() != new Date().getHours()) {
        index++;
    }

    let totalTime = 0; // used to test nn performance

    // build forecast
    let forecast = [];
    let day = [];
    for (let i = index; i < timeseries.length; i++) {
        let hour = new Date(timeseries[i].time);
        if (hour.getDKHours() < 6 || hour.getDKHours() > 22) continue;
        let details = timeseries[i].data.instant.details;
        let temp = details.air_temperature;
        let wind = details.wind_speed;
        let direction = details.wind_from_direction;
        if (day[0] != undefined && hour.getDKHours() < day[day.length - 1].hour.getDKHours()) {
            forecast.push(day);
            day = [];
        }
        const t0 = performance.now();
        day.push(new ForecastHour(hour, temp, wind, direction));
        const t1 = performance.now();
        totalTime += t1 - t0;
    }

    console.log(`Total ${useNN ? "inference time" : "calc time"}: ${totalTime} milliseconds.`);

    // build html
    forecast.forEach((day, dIndex) => {
        let div = document.createElement("div");
        let date = document.createElement("h4");
        date.style.marginBottom = "5px";
        div.style.opacity = "0";
        div.style.animationDelay = (dIndex * 0.2) + "s";
        date.textContent = getDay(day[0].hour.getDay()) + " " + day[0].hour.toLocaleDateString("da-DK", { timeZone: "Europe/Copenhagen" }).slice(0, -5).replace(".", "/");
        div.appendChild(date);
        tableDiv.appendChild(div);

        let table = document.createElement("table");
        table.appendChild(getTableHeader());
        let tbody = document.createElement("tbody");

        day.forEach(hour => {
            tbody.appendChild(hourRow(hour));
        });

        table.appendChild(tbody);
        div.appendChild(table);

        
        div.appendChild(sunDiv(sData, dIndex));
        div.className = "transition";
        
        tableDiv.appendChild(div);
    });
    document.getElementById("footer").className = "transition";
    
    if (debug) printCsv(forecast);
    console.log(swRegistered);
    if (swRegistered) {
        makeNotifications(forecast);
    }
}

function sunDiv(sunData, dIndex) {
    let sunDiv = document.createElement("div");
    sunDiv.style.display = "flex";
    sunDiv.style.justifyContent = "space-evenly";

    let sunriseDiv = document.createElement("div");
    sunriseDiv.className = "sunrise-div"

    {
        let img = document.createElement("img");
        img.className = "sun-img"
        img.src = "sunrise.svg";
        sunriseDiv.appendChild(img);
    }
    let sunrise = document.createElement("p");
    sunrise.textContent = new Date(sunData.location.time[dIndex].sunrise.time).toLocaleTimeString("da-DK", { timeZone: "Europe/Copenhagen" }).slice(0, -3).replace(".", ":");
    sunriseDiv.appendChild(sunrise);

    let sunsetDiv = document.createElement("div");
    sunsetDiv.className = "sunset-div"
    {
        let img = document.createElement("img");
        img.className = "sun-img"
        img.src = "sunset.svg";
        sunsetDiv.appendChild(img);
    }
    let sunset = document.createElement("p");
    sunset.textContent = new Date(sunData.location.time[dIndex].sunset.time).toLocaleTimeString("da-DK", { timeZone: "Europe/Copenhagen" }).slice(0, -3).replace(".", ":");
    sunsetDiv.appendChild(sunset);

    sunDiv.appendChild(sunriseDiv);
    sunDiv.appendChild(sunsetDiv);
    return sunDiv;
}

// print calculated data to console as csv to be used as temp data for nn
function printCsv(forecast) {
    let csv = "";
    forecast.forEach(day => {
        day.forEach(hour => {
            csv += `${hour.hour.getDKHours()}, ${hour.temp}, ${hour.wind}, ${hour.fromDirection}, ${hour.score}\n`;
        });
    });
    console.log(csv);
}

function setWaterTemp(tData) {
    let span = document.createElement("span");
    span.className = "waterTemp transition-no-transform";
    span.textContent = Math.round(tData.properties.timeseries[0].data.instant.details.sea_water_temperature) + "°"
    document.getElementById("waterTemp").appendChild(span);
}

function hourRow(hour) {
    let row = document.createElement("tr");
    let time = document.createElement("td");
    let temp = document.createElement("td");
    let wind = document.createElement("td");
    let score = document.createElement("td");
    score.style.color = scoreColor(hour.score);
    score.style.fontWeight = "bold";

    time.textContent = hour.hour.toLocaleTimeString("da-DK", { timeZone: "Europe/Copenhagen" }).slice(0, -3).replace(".", ":");
    temp.textContent = hour.temp.toFixed(0) + "°";
    if (temp.textContent === "-0°") temp.textContent = "0°";
    wind.textContent = hour.wind.toFixed(1);

    let img = document.createElement("img");
    img.style.transform = "rotate(" + hour.toDirection + "deg)";
    img.style.height = "20px";
    img.style.marginLeft = "10px";
    img.src = "arrow_lowres.png";
    wind.appendChild(img);

    score.textContent = hour.score;

    row.appendChild(time);
    row.appendChild(temp);
    row.appendChild(wind);
    row.appendChild(score);
    return row;
}

class ForecastHour {
    constructor(hour, temp, wind, direction) {
        this.hour = hour
        this.temp = temp;
        this.wind = wind;
        this.fromDirection = direction;
        this.toDirection = (direction + 180) % 360;
        this.score = calcButter(hour, temp, wind, direction);
    }
}


function toWxWy(wind, direction) {
    // Convert to rad
    let wd_rad = direction * Math.PI / 180;
    // Calculate the wind x and y components
    let wx = wind * Math.cos(wd_rad);
    let wy = wind * Math.sin(wd_rad);
    return [wx, wy];
}

function to_sinT_cosT(hour) {
    return [Math.sin(2 * Math.PI * hour / 24), Math.cos(2 * Math.PI * hour / 24)]
}

function calcButter(hour, temp, wind, direction) {
    if (useNN) return calcButterNN(hour, temp, wind, direction);
    let score = wind * windDirMultiplierArray[Math.round(direction)];
    return Math.round(score);
}

function calcButterNoNN(hour, temp, wind, direction) {
    let score = wind * windDirMultiplierArray[Math.round(direction)];
    return Math.round(score);
}

function calcButterNN(hour, temp, wind, direction) {
    const [wx, wy] = toWxWy(wind, direction);
    const [sinT, cosT] = to_sinT_cosT(hour.getDKHours());
    const inputTensor = tf.tensor([[temp / 35, sinT, cosT, wx, wy]])
    let res = model.predict(inputTensor).dataSync();
    if (res < 0) res = 0;
    return Math.round(res);
}

// must have multiplier at 0 and 360
function getMultipliers() {
    return [
        new Multiplier(0, 0.9), 
        new Multiplier(80, 0.6),
        new Multiplier(135, 0.35),
        new Multiplier(180, 0.3),
        new Multiplier(240, 0.5),
        new Multiplier(300, 0.75),
        new Multiplier(360, 0.9)
    ];
}

function buildWindDirMultiplierArray() {
    let array = [];
    let multipliers = getMultipliers();

    for (let i = 0; i < multipliers.length; i++) {
        if (multipliers[i + 1] == undefined) break; // ??? i<multipliers.length-1 ???
        let start = multipliers[i].fromDirection;
        let end = multipliers[i + 1].fromDirection;
        for (let j = start; j <= end; j++) {
            let distance = end - start;
            array[j] = linearInterpolation(multipliers[i].value, multipliers[i + 1].value, (j - start) / distance);
        }
    }

    let chart = document.getElementById("chart");
    for (let i = 0; i < array.length; i += 1) {
        let div = document.createElement("div");
        div.style.height = array[i] * 100 + "px";
        div.style.backgroundColor = scoreColor(Math.round(array[i] * 8));
        div.style.flexGrow = "1";
        chart.appendChild(div);
    };
    return array;
}


function linearInterpolation(a, b, t) {
    return a + (b - a) * t;
}

function scoreColor(score) {
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

function getTableHeader() {
    let header = document.createElement("thead");
    header.innerHTML = `<thead>
                            <tr>
                                <th>Time</th>
                                <th>Temp &degC</th>
                                <th>Vind m/s</th>
                                <th>Score</th>
                            </tr>
                        </thead>`
    return header;
}

function getDay(number) {
    switch (number) {
        case 0:
            return "Søndag";
        case 1:
            return "Mandag";
        case 2:
            return "Tirsdag";
        case 3:
            return "Onsdag";
        case 4:
            return "Torsdag";
        case 5:
            return "Fredag";
        case 6:
            return "Lørdag";
    }
}

function getTimezoneOffset(timeZone, date = new Date()) {
    // let dateString = date.toString().split(" ")[5];
    let dateString = date.toLocaleTimeString("en-US", { hour12: false, timeZone: timeZone, timeZoneName: "longOffset" });
    let sign = dateString.slice(12, 13);
    let hours = dateString.slice(13, 15);
    let minutes = dateString.slice(16, 18);


    // console.log(sign + hours + minutes);
    return `${sign}${hours}:${minutes}`
}

function getSUrl() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStr = month.toString().padStart(2, "0");
    const day = now.getDate();
    const dayStr = day.toString().padStart(2, "0");
    return `https://api.met.no/weatherapi/sunrise/2.0/.json?date=${year}-${monthStr}-${dayStr}&days=10&lat=57.0481&lon=9.941&offset=${getTimezoneOffset("Europe/Copenhagen")}`;
}
