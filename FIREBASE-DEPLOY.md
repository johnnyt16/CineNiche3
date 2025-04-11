# Firebase Deployment Instructions

This project is configured to deploy the frontend to Firebase Hosting while the backend remains on Azure.

## Prerequisites

1. Install Firebase CLI:
   ```
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```
   firebase login
   ```

## Manual Deployment

1. Build the frontend:
   ```
   cd frontend
   npm run build
   ```

2. Deploy to Firebase:
   ```
   firebase deploy
   ```

## CI/CD with GitHub Actions

The project is set up with automated deployment using GitHub Actions:

1. When you push to the `main` branch, the frontend will automatically be built and deployed to Firebase.

2. To enable GitHub Actions, you need to add the Firebase service account secret to your GitHub repository:
   - Go to Firebase Console > Project Settings > Service accounts
   - Click "Generate new private key"
   - Copy the contents of the downloaded JSON file
   - Go to your GitHub repository Settings > Secrets > Actions
   - Create a new secret named `FIREBASE_SERVICE_ACCOUNT_CINENICHE_91C50` with the JSON content

## Configuration Files

- `firebase.json`: Contains hosting configuration
- `.firebaserc`: Contains project association
- `.github/workflows/firebase-hosting-deploy.yml`: GitHub Actions workflow

## Project Information

- Project ID: cineniche-91c50
- Project Name: CineNiche

## Accessing the Deployed Application

The frontend is accessible at:
- https://cineniche-91c50.web.app
- https://cineniche-91c50.firebaseapp.com

The backend API remains at:
- https://cineniche-fkazataxamgph8bu.eastus-01.azurewebsites.net/api 