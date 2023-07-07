fetch("https://ahpa.azurewebsites.net/api/butter/")
.then(res => {
    document.getElementById("data").textContent = res.text();
});