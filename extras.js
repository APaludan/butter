const url = new URL(window.location.href);
const debug = url.searchParams.get('debug');

if (debug == 'true') {
    document.getElementById("chartDiv").classList.toggle("hidden");
}

const form = document.getElementById("form");
const res = document.getElementById("res");
form.addEventListener("submit", function (event) {
    event.preventDefault();
    password = document.getElementById("password").value;
    score = document.getElementById("score").value;
    try {
        fetch("https://ahpa.azurewebsites.net/api/butter?password=" + password + "&score=" + score, { method: "POST" })
        .then(function (response) {
            res.innerHTML = response.text;
        });
    } catch (error) {
        res.innerHTML = error;
    }
});