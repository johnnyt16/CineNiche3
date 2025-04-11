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

# Create data directory to ensure it exists
RUN mkdir -p /app/Data

# Copy database files - try multiple possible locations to ensure one works
COPY Backend/Movies.db /app/ || true
COPY Movies.db /app/ || true
COPY Backend/Backend/Movies.db /app/ || true
COPY Backend/Backend/Data/Movies.db /app/Data/ || true

# Set permissions
RUN chmod 644 /app/Movies.db || true
RUN chmod 644 /app/Data/Movies.db || true

# Use environment variable for the port (Cloud Run provides PORT env var)
ENV ASPNETCORE_URLS=http://+:${PORT:-80}
ENTRYPOINT ["dotnet", "Backend.dll"] 