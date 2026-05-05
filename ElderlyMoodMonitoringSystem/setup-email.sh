#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}ElderCare - Email Configuration Setup Script${NC}"
echo -e "${GREEN}================================================${NC}\n"

# Check if we're in the right directory
if [ ! -f "firebase.json" ]; then
    echo -e "${RED}❌ Error: firebase.json not found${NC}"
    echo -e "Please run this script from the project root directory"
    echo -e "cd /Users/abduladam/ElderlyMoodMonitoringSystem"
    echo -e "./setup-email.sh"
    exit 1
fi

echo -e "${YELLOW}Step 1: Checking Firebase CLI...${NC}"
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI not found${NC}"
    echo "Please install: npm install -g firebase-tools"
    exit 1
fi
echo -e "${GREEN}✅ Firebase CLI found${NC}\n"

echo -e "${YELLOW}Step 2: Checking login status...${NC}"
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}Not logged in - starting login...${NC}"
    firebase login
fi
echo -e "${GREEN}✅ Firebase authenticated${NC}\n"

echo -e "${YELLOW}Step 3: Setting SMTP Configuration...${NC}"
echo -e "Using Gmail SMTP with app password"

# Set SMTP configuration
firebase functions:config:set \
  smtp.host="smtp.gmail.com" \
  smtp.port="587" \
  smtp.secure="false" \
  smtp.user="your-email@gmail.com" \
  smtp.pass="your-app-password-here" \
  smtp.from="noreply@elderly-mood-monitoring.firebaseapp.com"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SMTP configuration set${NC}\n"
else
    echo -e "${RED}❌ Failed to set SMTP configuration${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 4: Getting your app domain...${NC}"
PROJECT=$(firebase projects:list | grep elderly-mood-monitoring | awk '{print $1}')
if [ -z "$PROJECT" ]; then
    echo -e "${YELLOW}Could not auto-detect app URL${NC}"
    read -p "Enter your app URL (e.g., https://elderly-mood-monitoring.firebaseapp.com): " APP_URL
else
    APP_URL="https://${PROJECT}.firebaseapp.com"
    echo -e "Detected app URL: ${APP_URL}"
fi

firebase functions:config:set app.host="${APP_URL}"
echo -e "${GREEN}✅ App host configured${NC}\n"

echo -e "${YELLOW}Step 5: Installing dependencies...${NC}"
cd functions
npm install
cd ..
echo -e "${GREEN}✅ Dependencies installed${NC}\n"

echo -e "${YELLOW}Step 6: Deploying Cloud Functions...${NC}"
echo -e "This may take a minute or two..."
firebase deploy --only functions

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Functions deployed successfully!${NC}\n"
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}Setup Complete! 🎉${NC}"
    echo -e "${GREEN}================================================${NC}\n"
    
    echo -e "Your app is ready to send verification emails!"
    echo -e "\nNext steps:"
    echo -e "1. Go to your app Profile page"
    echo -e "2. Add a caregiver with a real email"
    echo -e "3. Click 'Request Verification'"
    echo -e "4. Check your email for the verification link"
    echo -e "\nFor troubleshooting, see EMAIL_SETUP_GUIDE.md"
else
    echo -e "${RED}❌ Function deployment failed${NC}"
    exit 1
fi
