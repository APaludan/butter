const url = "https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=57.0481&lon=9.941";
const windS = document.getElementById("wind");
const tempS = document.getElementById("temp");
const arrowS = document.getElementById("arrow");
const wackS = document.getElementById("wack");
let avgTemp = null;
let avgWind = null;
let avgDirection = null;

update()

function update() {
    fetch(url)
        .then(response => response.json())
        .then(data => {
            let now = data["properties"]["timeseries"][0]["data"];
            let temp = now["instant"]["details"]["air_temperature"];
            let wind = now["instant"]["details"]["wind_speed"];
            let direction = now["instant"]["details"]["wind_from_direction"];

            let next = data["properties"]["timeseries"][1]["data"];
            let nextTemp = next["instant"]["details"]["air_temperature"];
            let nextWind = next["instant"]["details"]["wind_speed"];
            let nextDirection = next["instant"]["details"]["wind_from_direction"];

            avgTemp = (temp + nextTemp) / 2;
            avgWind = (wind + nextWind) / 2;
            avgDirection = (direction + nextDirection) / 2;

            tempS.innerHTML = avgTemp.toFixed(0);
            windS.innerHTML = avgWind.toFixed(1);
            arrowS.style.transform = "rotate(" + (avgDirection + 180) + "deg)";
            calcWack();
        })
}

function calcWack() {
    let wack = avgWind * 1.3 * windDirScore(avgDirection);
    console.log("wack: " + wack);
    wackS.innerHTML = wack.toFixed(0);
}

function test(temp, wind, dir) {
    avgTemp = temp;
    avgWind = wind;
    avgDirection = dir;
    tempS.innerHTML = avgTemp.toFixed(0);
    windS.innerHTML = avgWind.toFixed(1);
    arrowS.style.transform = "rotate(" + (avgDirection + 180) + "deg)";
    calcWack();
}

function windDirScore(dir) {
    if (dir >= 0 && dir <= 45)
        return 0.6;
    else if (dir >= 45 && dir <= 90)
        return 0.5;
    else if (dir >= 90 && dir <= 135)
        return 0.35;
    else if (dir >= 135 && dir <= 180)
        return 0.2;
    else if (dir >= 180 && dir <= 225)
        return 0.2;
    else if (dir >= 225 && dir <= 270)
        return 0.6;
    else if (dir >= 270 && dir <= 315)
        return 0.7;
    else if (dir >= 315 && dir <= 360)
        return 0.6;
    else
        alert("error in windDirScore");
}