
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
    let wData, tData;
    if (useNN) {
        [model, wData, tData] = await Promise.all([
            tf.loadLayersModel('nn/tfjs_model/model.json'),
            fetch(wUrl).then(response => response.json()),
            fetch(tUrl).then(response => response.json())]);
        tf.setBackend('cpu');
        tf.enableProdMode();
    }
    else {
        [wData, tData] = await Promise.all([
            fetch(wUrl).then(response => response.json()),
            fetch(tUrl).then(response => response.json())]);
    }

    setInfo(tData);

    let idx = 0;

    // Skip old data
    let timeseries = wData.properties.timeseries;
    while (new Date(timeseries[idx].time).getHours() != new Date().getHours()) {
        idx++;
    }

    let totalTime = 0; // used to test nn performance

    // build forecast
    let forecast = [];
    let day = [];
    for (let i = idx; i < timeseries.length; i++) {
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

        
        div.className = "transition";
        
        tableDiv.appendChild(div);
    });
    document.getElementById("footer").className = "transition";
    
    if (debug) printCsv(forecast);
}

function setInfo(waterData) {
    const times = SunCalc.getTimes(new Date(), 57.0481, 9.941);
    const sunriseStr = times.sunrise.getHours() + ':' + times.sunrise.getMinutes().toString().padStart(2, 0);
    const sunsetStr = times.sunset.getHours() + ':' + times.sunset.getMinutes().toString().padStart(2, 0);

    document.getElementById("sunrise").textContent = sunriseStr;
    document.getElementById("sunrise").classList.add("transition-no-transform");

    document.getElementById("sunset").textContent = sunsetStr;
    document.getElementById("sunset").classList.add("transition-no-transform");
    
    document.getElementById("watertemp").textContent = Math.round(waterData.properties.timeseries[0].data.instant.details.sea_water_temperature) + "°";
    document.getElementById("watertemp").classList.add("transition-no-transform");
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
    img.src = "imgs/arrow_lowres.png";
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