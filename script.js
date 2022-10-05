const url = "https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=57.0481&lon=9.941";
const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
const windN = document.getElementById("wind");
const tempN = document.getElementById("temp");
const arrowN = document.getElementById("arrow");
const wackN = document.getElementById("wack");

const windH = document.getElementById("wind1");
const tempH = document.getElementById("temp1");
const arrowH = document.getElementById("arrow1");
const wackH = document.getElementById("wack1");

if (isDarkMode) {
    document.getElementsByTagName("html")[0].className = "dark";
}
else {
    document.getElementsByTagName("html")[0].className = "";
}


update()

function update() {
    fetch(url)
        .then(response => response.json())
        .then(data => {
            let nowTime = new Date();
            let utcHours = nowTime.getUTCHours();
            let index = 0;

            let timeseries = data["properties"]["timeseries"];
            while (timeseries[index]["time"].substring(11, 13) != utcHours.toString()) {
                index++;
            }
            let forecast = [];
            for (let i = index; i < 5; i++) {
                let now = timeseries[i]["data"];
                let temp = now["instant"]["details"]["air_temperature"];
                let wind = now["instant"]["details"]["wind_speed"];
                let direction = now["instant"]["details"]["wind_from_direction"];
                forecast.push(new Hour(temp, wind, direction));
            }
            console.log(forecast);


            tempN.innerHTML = forecast[0].temp.toFixed(0);
            windN.innerHTML = forecast[0].wind.toFixed(1);
            arrowN.style.transform = "rotate(" + (forecast[0].direction + 180) + "deg)";
            wackN.innerHTML = forecast[0].wack.toFixed(0);

            tempH.innerHTML = forecast[1].temp.toFixed(0);
            windH.innerHTML = forecast[1].wind.toFixed(1);
            arrowH.style.transform = "rotate(" + (forecast[1].direction + 180) + "deg)";
            wackH.innerHTML = forecast[1].wack.toFixed(0);
        })
}

function calcWack(wind, direction) {
    let wack = wind * 1.3 * windDirScore(direction);
    return wack;
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

class Hour {
    constructor(temp, wind, direction) {
        this.temp = temp;
        this.wind = wind;
        this.direction = direction;
        this.wack = calcWack(wind, direction);
    }
}