fetch("https://ahpa.azurewebsites.net/api/butter/")
    .then(res => res.text().then(text => document.getElementById("data").innerHTML = text));