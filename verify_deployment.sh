#!/bin/bash

echo "=== Deployment Verification Script ==="
echo ""

echo "1. Checking if modifications exist in Linux environment:"
echo "   Checking app/main.py for /webmic/test:"
grep -n "webmic/test" app/main.py | head -3
echo ""

echo "2. Checking .dockerignore for public:"
grep "public" .dockerignore
echo ""

echo "3. Checking if public directory exists:"
ls -la public/ | head -5
echo ""

echo "4. Testing local syntax:"
python3 -m py_compile app/main.py && echo "   ✓ Syntax OK" || echo "   ✗ Syntax Error"
echo ""

echo "5. Checking git status:"
git log --oneline -3
echo ""

echo "6. Verifying container build includes public:"
echo "   Checking if .dockerignore allows public directory"
cat .dockerignore
echo ""

echo "=== Next Steps ==="
echo "If all checks pass, run: make deploy"
echo "Then test: https://your-app-url/webmic/test"
