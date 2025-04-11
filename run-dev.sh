#!/bin/bash

# Script to run both frontend and backend

# Start backend in the background
echo "Starting backend..."
cd Backend/Backend
dotnet run &
BACKEND_PID=$!

# Start frontend in the background
echo "Starting frontend..."
cd ../../frontend
npm start &
FRONTEND_PID=$!

# Function to kill processes on exit
cleanup() {
    echo "Stopping services..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit 0
}

# Register the cleanup function to run on exit
trap cleanup INT TERM

echo "Services started. Press Ctrl+C to stop."
wait 