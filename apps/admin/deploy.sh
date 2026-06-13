#!/bin/bash

# GoGoCash Admin Dashboard - Google Cloud Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=""
SERVICE_NAME="gogocash-admin"
REGION="us-central1"
DEPLOYMENT_TYPE=""

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if gcloud is installed and authenticated
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v gcloud &> /dev/null; then
        print_error "Google Cloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install it from https://www.docker.com/products/docker-desktop/"
        exit 1
    fi
    
    # Check if user is authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        print_error "You are not authenticated with Google Cloud. Please run 'gcloud auth login'"
        exit 1
    fi
    
    print_status "Prerequisites check passed!"
}

# Function to setup Google Cloud project
setup_project() {
    if [ -z "$PROJECT_ID" ]; then
        echo "Enter your Google Cloud Project ID:"
        read PROJECT_ID
    fi
    
    print_status "Setting up Google Cloud project: $PROJECT_ID"
    
    gcloud config set project $PROJECT_ID
    
    print_status "Enabling required APIs..."
    gcloud services enable cloudbuild.googleapis.com
    gcloud services enable run.googleapis.com
    gcloud services enable containerregistry.googleapis.com
    
    print_status "Project setup completed!"
}

# Function to build and deploy to Cloud Run
deploy_cloud_run() {
    print_status "Deploying to Cloud Run..."
    
    # Build and push image using Cloud Build
    print_status "Building Docker image with Cloud Build..."
    gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME .
    
    # Deploy to Cloud Run
    print_status "Deploying to Cloud Run..."
    gcloud run deploy $SERVICE_NAME \
        --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
        --platform managed \
        --region $REGION \
        --allow-unauthenticated \
        --port 3000 \
        --set-env-vars NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1 \
        --memory 512Mi \
        --cpu 1 \
        --min-instances 0 \
        --max-instances 10
    
    # Get the service URL
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')
    print_status "Deployment completed! Your app is available at: $SERVICE_URL"
}

# Function to deploy to App Engine
deploy_app_engine() {
    print_status "Deploying to App Engine..."
    
    if [ ! -f "app.yaml" ]; then
        print_error "app.yaml not found. Make sure you're in the project directory."
        exit 1
    fi
    
    gcloud app deploy app.yaml --quiet
    
    APP_URL=$(gcloud app describe --format="value(defaultHostname)")
    print_status "Deployment completed! Your app is available at: https://$APP_URL"
}

# Function to deploy to GKE
deploy_gke() {
    print_status "Deploying to Google Kubernetes Engine..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed. Please install it first."
        exit 1
    fi
    
    # Build and push image
    print_status "Building and pushing Docker image..."
    gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME .
    
    # Update deployment manifest with project ID
    sed -i.bak "s/PROJECT_ID/$PROJECT_ID/g" k8s/deployment.yaml
    
    # Apply Kubernetes manifests
    print_status "Applying Kubernetes manifests..."
    kubectl apply -f k8s/
    
    # Restore original deployment.yaml
    mv k8s/deployment.yaml.bak k8s/deployment.yaml
    
    print_status "GKE deployment completed! Check 'kubectl get services' for external IP."
}

# Function to show deployment options
show_menu() {
    echo "Choose deployment option:"
    echo "1) Cloud Run (Recommended - Serverless)"
    echo "2) App Engine (Fully managed platform)"
    echo "3) Google Kubernetes Engine (Advanced container orchestration)"
    echo "4) Exit"
    
    read -p "Enter your choice [1-4]: " choice
    
    case $choice in
        1)
            DEPLOYMENT_TYPE="cloudrun"
            ;;
        2)
            DEPLOYMENT_TYPE="appengine"
            ;;
        3)
            DEPLOYMENT_TYPE="gke"
            ;;
        4)
            print_status "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid choice. Please select 1-4."
            show_menu
            ;;
    esac
}

# Function to set environment variables
set_env_vars() {
    print_warning "Don't forget to set your environment variables!"
    echo "Required environment variables:"
    echo "- NEXTAUTH_URL: Your production domain"
    echo "- NEXTAUTH_SECRET: Your JWT secret"
    echo "- API_BASE_URL: Your backend API URL"
    echo ""
    echo "For Cloud Run, you can set them with:"
    echo "gcloud run services update $SERVICE_NAME --set-env-vars NEXTAUTH_URL=https://your-domain.com,NEXTAUTH_SECRET=your-secret --region $REGION"
}

# Main execution
main() {
    print_status "GoGoCash Admin Dashboard - Google Cloud Deployment"
    echo "=================================================="
    
    check_prerequisites
    setup_project
    show_menu
    
    case $DEPLOYMENT_TYPE in
        "cloudrun")
            deploy_cloud_run
            ;;
        "appengine")
            deploy_app_engine
            ;;
        "gke")
            deploy_gke
            ;;
    esac
    
    set_env_vars
    print_status "Deployment process completed!"
}

# Handle script arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project)
            PROJECT_ID="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -t|--type)
            DEPLOYMENT_TYPE="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -p, --project PROJECT_ID    Set Google Cloud Project ID"
            echo "  -r, --region REGION         Set deployment region (default: us-central1)"
            echo "  -t, --type TYPE             Set deployment type (cloudrun|appengine|gke)"
            echo "  -h, --help                  Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main