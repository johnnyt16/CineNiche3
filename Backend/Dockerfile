FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy everything and restore
COPY . ./
RUN dotnet restore Backend/Backend/Backend.csproj

# Build and publish
WORKDIR /app/Backend/Backend
RUN dotnet publish -c Release -o /app/publish

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./

# Create data directory and empty database files
RUN mkdir -p /app/Data && \
    touch /app/Movies.db && \
    touch /app/Data/Movies.db && \
    chmod 644 /app/Movies.db && \
    chmod 644 /app/Data/Movies.db

# Environment configuration
ENV ASPNETCORE_URLS=http://+:${PORT:-80}

# Start the app
ENTRYPOINT ["dotnet", "Backend.dll"] 