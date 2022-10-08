const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
if (isDarkMode)
    document.getElementsByTagName("html")[0].className = "dark";
else
    document.getElementsByTagName("html")[0].className = "";


document.getElementById("toggle").addEventListener("click", () => {
    document.getElementById("chartDiv").classList.toggle("hidden");
});