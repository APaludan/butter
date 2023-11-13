using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddCors(options =>
{
    options.AddPolicy(name: "All",
        policy =>
        {
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        });
});

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var url = "";

if (Environment.GetEnvironmentVariable("PORT") == null)
{
    url = "https://localhost:8080";
}
else
{
    var port = Environment.GetEnvironmentVariable("PORT");
    url = $"http://0.0.0.0:{port}";
}


var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("All");

app.MapGet("/watertemp", async () =>
{
    var dateString = DateTime.Now.ToString("yyyy-MM-ddTHH:00", CultureInfo.InvariantCulture);
    var response = await new HttpClient().GetAsync($"https://dmigw.govcloud.dk/v1/forecastedr/collections/DKSS_LF/position?coords=POINT(9.94088%2057.04797)&crs=crs84&parameter-name=water-temperature-1m&datetime={dateString}%2B02:00&api-key=f2411e62-d181-43ed-af72-55ad422a6a9a");
    if (!response.IsSuccessStatusCode)
    {
        return Results.Problem("DMI virker ik :(");
    }
    var json = JsonSerializer.Deserialize<JsonElement>(response.Content.ReadAsStream());
    var temperature = json.GetProperty("ranges").GetProperty("water-temperature-1m").GetProperty("values").EnumerateArray().First().GetSingle();
    return Results.Ok(temperature);
})
.WithName("GetWaterTemp")
.WithOpenApi();

app.Run(url);