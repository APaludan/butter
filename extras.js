const url = new URL(window.location.href);
const debug = url.searchParams.get('debug');

if (debug == 'true') {
    document.getElementById("chartDiv").classList.toggle("hidden");
}