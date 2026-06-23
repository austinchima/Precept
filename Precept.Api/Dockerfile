FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["Precept.Api.csproj", "./"]
RUN dotnet restore "./Precept.Api.csproj"
COPY . .
RUN dotnet build "Precept.Api.csproj" -c Release -o /app/build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS dev
WORKDIR /src
COPY ["Precept.Api.csproj", "./"]
RUN dotnet restore "./Precept.Api.csproj"
COPY . .
EXPOSE 8080
CMD ["dotnet", "watch", "run", "--project", "Precept.Api.csproj", "--no-launch-profile", "--urls", "http://0.0.0.0:8080"]

FROM build AS publish
RUN dotnet publish "Precept.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Precept.Api.dll"]
