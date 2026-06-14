# Google Cloud Deployment Guide

> **Branch policy:** This project pushes to the **staging** branch only. Use `git push origin main:staging` (or push from your local branch to `origin/staging`) for deployments. Do not push to `main` on the remote.

This guide covers deploying the GoGoCash Admin Dashboard to Google Cloud using multiple deployment options.

## Prerequisites

1. **Google Cloud SDK**: Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
2. **Docker**: Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
3. **Google Cloud Project**: Create or select a project in [Google Cloud Console](https://console.cloud.google.com/)

## Setup Google Cloud CLI

```bash
# Login to Google Cloud
gcloud auth login

# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

## Deployment Options

### Option 1: Cloud Run (Recommended)

Cloud Run is serverless and automatically scales based on demand.

#### Using Cloud Build (Automated)

1. **Setup Cloud Build trigger:**
```bash
# Connect your GitHub repository
gcloud builds triggers create github \
  --repo-name=gogocash-admin-demo \
  --repo-owner=mygogocash \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

2. **Manual build and deploy:**
```bash
# Build and deploy using Cloud Build
gcloud builds submit --config cloudbuild.yaml .
```

#### Direct Docker Deployment

1. **Build and push Docker image:**
```bash
# Set your project ID
export PROJECT_ID=your-project-id

# Build the Docker image
docker build -t gcr.io/$PROJECT_ID/gogocash-admin .

# Push to Google Container Registry
docker push gcr.io/$PROJECT_ID/gogocash-admin
```

2. **Deploy to Cloud Run:**
```bash
gcloud run deploy gogocash-admin \
  --image gcr.io/$PROJECT_ID/gogocash-admin \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars NODE_ENV=production
```

### Option 2: App Engine

App Engine provides a fully managed platform with automatic scaling.

1. **Deploy to App Engine:**
```bash
gcloud app deploy app.yaml
```

2. **View your application:**
```bash
gcloud app browse
```

### Option 3: Google Kubernetes Engine (GKE)

For advanced container orchestration needs.

1. **Create GKE cluster:**
```bash
gcloud container clusters create gogocash-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 10
```

2. **Get cluster credentials:**
```bash
gcloud container clusters get-credentials gogocash-cluster --zone us-central1-a
```

3. **Deploy using Kubernetes manifests:**
```bash
kubectl apply -f k8s/
```

## Environment Variables

Make sure to set these environment variables for production:

### Required Environment Variables
- `NEXTAUTH_URL`: Your production domain (e.g., https://your-app.run.app)
- `NEXTAUTH_SECRET`: Your JWT secret key
- `API_BASE_URL`: Your backend API URL (e.g., http://localhost:8080)

### Setting Environment Variables

#### For Cloud Run:
```bash
gcloud run services update gogocash-admin \
  --set-env-vars NEXTAUTH_URL=https://your-app.run.app,NEXTAUTH_SECRET=your-jwt-secret,API_BASE_URL=https://your-api.com \
  --region us-central1
```

#### For App Engine:
Add to `app.yaml`:
```yaml
env_variables:
  NEXTAUTH_URL: "https://your-app.appspot.com"
  NEXTAUTH_SECRET: "your-jwt-secret"
  API_BASE_URL: "https://your-api.com"
```

## Custom Domain Setup

### Cloud Run
1. **Map custom domain:**
```bash
gcloud run domain-mappings create \
  --service gogocash-admin \
  --domain your-domain.com \
  --region us-central1
```

2. **Update DNS records** as shown in the Cloud Console

### App Engine
1. **Add custom domain:**
```bash
gcloud app domain-mappings create your-domain.com
```

## Monitoring and Logging

### Enable Cloud Monitoring
```bash
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com
```

### View Logs
```bash
# Cloud Run logs
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=gogocash-admin" --limit 50

# App Engine logs
gcloud logs read "resource.type=gae_app" --limit 50
```

## Scaling Configuration

### Cloud Run Auto-scaling
```bash
gcloud run services update gogocash-admin \
  --min-instances 0 \
  --max-instances 10 \
  --concurrency 80 \
  --cpu 1 \
  --memory 512Mi \
  --region us-central1
```

## Security Best Practices

1. **Use IAM roles** for service-to-service communication
2. **Enable Cloud Armor** for DDoS protection
3. **Use Cloud CDN** for static asset caching
4. **Set up SSL certificates** (automatic with Cloud Run)
5. **Configure CORS** properly for your API endpoints

## Cost Optimization

1. **Use Cloud Run** for automatic scaling to zero
2. **Enable CDN** for static assets
3. **Set up budget alerts** in Cloud Console
4. **Use preemptible instances** for non-critical workloads

## Troubleshooting

### Common Issues

1. **Build Failures:**
   - Check Docker build logs: `gcloud builds log [BUILD_ID]`
   - Verify `package.json` and dependencies

2. **Runtime Errors:**
   - Check application logs: `gcloud logs read`
   - Verify environment variables are set correctly

3. **Connection Issues:**
   - Ensure API endpoints are accessible
   - Check CORS configuration
   - Verify NEXTAUTH_URL is correct

### Debug Commands
```bash
# Check service status
gcloud run services describe gogocash-admin --region us-central1

# View recent deployments
gcloud run revisions list --service gogocash-admin --region us-central1

# Test local Docker build
docker run -p 3000:3000 gcr.io/PROJECT_ID/gogocash-admin
```

## Continuous Integration/Continuous Deployment (CI/CD)

The included `cloudbuild.yaml` provides automatic deployment when you push to the main branch. To set this up:

1. Connect your repository to Cloud Build
2. Create a trigger for the main branch
3. Every push will automatically build and deploy your application

## Performance Optimization

1. **Enable compression** in your reverse proxy
2. **Use Cloud CDN** for static assets
3. **Optimize images** using Next.js Image optimization
4. **Enable caching headers** for static resources

For more detailed information, refer to the [Google Cloud documentation](https://cloud.google.com/docs).