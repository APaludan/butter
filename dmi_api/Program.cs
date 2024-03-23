using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy(name: "All",
        policy =>
        {
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        });
});

var app = builder.Build();

app.UseHttpsRedirection();

app.UseCors("All");

app.MapGet("/watertemp", async () =>
{
    var dateString = DateTime.Now.ToString("yyyy-MM-ddTHH:00", CultureInfo.InvariantCulture);
    var client = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
    try
    {
        var response = await client.GetAsync($"https://dmigw.govcloud.dk/v1/forecastedr/collections/DKSS_LF/position?coords=POINT(9.941%2057.048)&crs=crs84&parameter-name=water-temperature-1m&datetime={dateString}%2B02:00&api-key=f2411e62-d181-43ed-af72-55ad422a6a9a");
        var json = JsonSerializer.Deserialize<JsonElement>(response.Content.ReadAsStream());
        var temperature = json.GetProperty("ranges").GetProperty("water-temperature-1m").GetProperty("values").EnumerateArray().First().GetSingle();
        return Results.Ok(temperature);
    }
    catch (Exception)
    {
        return Results.Problem("DMI virker ikke :(");
    }
});

var port = Environment.GetEnvironmentVariable("PORT");
var url = port == null ? "https://localhost:8080" : $"http://0.0.0.0:{port}";
app.Run(url);