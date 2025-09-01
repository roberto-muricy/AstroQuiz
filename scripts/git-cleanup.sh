#!/bin/bash

# 🧹 Git Repository Cleanup Script
# Removes sensitive files and prepares for clean deployment

echo "🧹 Starting Git Repository Cleanup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_error "Not in a Git repository!"
    exit 1
fi

print_info "Current directory: $(pwd)"

# 1. Remove sensitive files if they exist
print_info "Step 1: Removing sensitive files..."

SENSITIVE_FILES=(
    "firebase-service-account.json"
    "*.key"
    "*.pem"
    ".env"
    "config/database.js"
)

for file in "${SENSITIVE_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_warning "Removing sensitive file: $file"
        rm -f "$file"
        git rm --cached "$file" 2>/dev/null || true
    fi
done

# 2. Create comprehensive .gitignore
print_info "Step 2: Creating comprehensive .gitignore..."

cat > .gitignore << 'EOF'
# 🔐 Security & Credentials
*.key
*.pem
*.p12
*.crt
*.cer
firebase-service-account*.json
service-account*.json
google-credentials*.json
aws-credentials*.json

# 🌍 Environment Files
.env
.env.*
!.env.example

# 📦 Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnp
.pnp.js

# 🏗️ Build & Distribution
dist/
build/
.tmp/
.cache/
coverage/

# 📊 Logs
logs/
*.log
.strapi-updater.json

# 🗄️ Databases
*.db
*.sqlite
*.sqlite3
.tmp/data.db

# 🎯 IDE & OS
.DS_Store
.vscode/
.idea/
*.swp
*.swo
*~

# 🚀 Strapi Specific
.strapi/
.strapi-updater.json
exports/
.strapi-cloud.json

# 📱 Mobile
*.mobileprovision

# 🧪 Testing
coverage/
.nyc_output/

# 📈 Analytics & Monitoring
.sentryclirc

# 🔧 Tools
.eslintcache
.stylelintcache
EOF

print_status "Enhanced .gitignore created"

# 3. Check Git status
print_info "Step 3: Checking Git status..."
git status --porcelain

# 4. Add safe files to Git
print_info "Step 4: Adding safe files to Git..."
git add .gitignore
git add package.json
git add package-lock.json
git add README.md
git add src/
git add config/
git add scripts/
git add docs/
git add public/
git add types/
git add tsconfig.json

# 5. Check if there are sensitive files in Git history
print_info "Step 5: Checking for sensitive files in Git history..."

SENSITIVE_IN_HISTORY=$(git log --name-only --pretty=format: --all | grep -E "(firebase-service-account|\.key|\.pem|\.env$)" | sort -u)

if [ ! -z "$SENSITIVE_IN_HISTORY" ]; then
    print_warning "Found sensitive files in Git history:"
    echo "$SENSITIVE_IN_HISTORY"
    
    read -p "Do you want to remove these files from Git history? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Rewriting Git history to remove sensitive files..."
        
        # Use git filter-branch to remove sensitive files from history
        for file in $SENSITIVE_IN_HISTORY; do
            print_info "Removing $file from Git history..."
            git filter-branch --force --index-filter \
                "git rm --cached --ignore-unmatch $file" \
                --prune-empty --tag-name-filter cat -- --all
        done
        
        # Clean up
        git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
        git reflog expire --expire=now --all
        git gc --prune=now --aggressive
        
        print_status "Git history cleaned"
    else
        print_warning "Skipping Git history cleanup"
    fi
fi

# 6. Create deployment-ready commit
print_info "Step 6: Creating deployment-ready commit..."

# Check if there are changes to commit
if [ -n "$(git status --porcelain)" ]; then
    git commit -m "🚀 Prepare for Railway deployment

- Remove sensitive files from repository
- Add comprehensive .gitignore
- Clean up project structure
- Add Quiz Engine implementation
- Ready for production deployment"
    
    print_status "Deployment commit created"
else
    print_info "No changes to commit"
fi

# 7. Show final status
print_info "Step 7: Final repository status..."
echo
print_status "Repository cleanup completed!"
echo
print_info "Summary:"
echo "  - Sensitive files removed"
echo "  - Comprehensive .gitignore added"
echo "  - Repository ready for deployment"
echo
print_info "Next steps:"
echo "  1. Review changes: git log --oneline -5"
echo "  2. Push to GitHub: git push origin main"
echo "  3. Deploy to Railway: Connect GitHub repository"
echo
print_warning "Remember to set environment variables in Railway dashboard!"
EOF
