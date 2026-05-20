#!/bin/bash
# Potter's Duel - Project File Verification Script

echo "=========================================="
echo "Potter's Duel - Project Structure Check"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check file exists
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1"
    return 0
  else
    echo -e "${RED}✗${NC} $1 (MISSING)"
    return 1
  fi
}

# Function to check directory exists
check_dir() {
  if [ -d "$1" ]; then
    echo -e "${GREEN}✓${NC} $1/"
    return 0
  else
    echo -e "${RED}✗${NC} $1/ (MISSING)"
    return 1
  fi
}

echo "📁 DIRECTORIES:"
echo "==============="
check_dir "client"
check_dir "client/js"
check_dir "server"
check_dir "database"
echo ""

echo "📄 ROOT FILES:"
echo "==============="
check_file "package.json"
check_file ".env.example"
check_file ".gitignore"
check_file "README.md"
check_file "SETUP_GUIDE.md"
check_file "PROJECT_FILES.md"
check_file "API_REFERENCE.md"
check_file "verify_project.sh"
echo ""

echo "🌐 CLIENT FILES:"
echo "================"
check_file "client/index.html"
check_file "client/style.css"
check_file "client/js/auth.js"
check_file "client/js/socket-client.js"
check_file "client/js/renderer.js"
check_file "client/js/ui.js"
check_file "client/js/game-logic.js"
echo ""

echo "⚙️  SERVER FILES:"
echo "================"
check_file "server/server.js"
check_file "server/db.js"
check_file "server/game-logic.js"
check_file "server/email-service.js"
echo ""

echo "💾 DATABASE FILES:"
echo "=================="
check_file "database/schema.sql"
echo ""

echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo "1. Copy .env.example to .env"
echo "2. Configure database credentials in .env"
echo "3. Run: npm install"
echo "4. Run: npm run dev"
echo "5. In another terminal: npx http-server client -p 3000"
echo ""
echo "✅ Project Ready!"
echo ""
