FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["src/DevTrack.Api/DevTrack.Api.csproj", "src/DevTrack.Api/"]
RUN dotnet restore "src/DevTrack.Api/DevTrack.Api.csproj"

COPY . .
RUN dotnet publish "src/DevTrack.Api/DevTrack.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "DevTrack.Api.dll"]
