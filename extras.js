const url = new URL(window.location.href);
const debug = url.searchParams.get('debug') == 'true';

if (debug) {
    document.getElementById("chartDiv").classList.toggle("hidden");
}