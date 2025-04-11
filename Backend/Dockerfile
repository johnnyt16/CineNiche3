FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src
COPY ["Backend/Backend.csproj", "Backend/"]
RUN dotnet restore "Backend/Backend.csproj"
COPY . .
WORKDIR "/src/Backend"
RUN dotnet build "Backend.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Backend.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Create data directory and empty database files
RUN mkdir -p /app/Data && \
    touch /app/Movies.db && \
    touch /app/Data/Movies.db && \
    chmod 644 /app/Movies.db && \
    chmod 644 /app/Data/Movies.db

# Use environment variable for the port (Cloud Run provides PORT env var)
ENV ASPNETCORE_URLS=http://+:${PORT:-80}
ENTRYPOINT ["dotnet", "Backend.dll"] 