#!/usr/bin/env bash
# Automated Lighthouse Performance & Accessibility Audit Script
set -e

echo "========================================================"
echo " Starting Lighthouse Audit for Praveen M MERN Portfolio "
echo " Target URL: http://localhost:5173                      "
echo "========================================================"

if ! command -v lighthouse &> /dev/null; then
  echo "[Lighthouse] Installing Lighthouse CLI globally via npm..."
  npm install -g lighthouse
fi

echo "[Lighthouse] Executing audit against local preview..."
lighthouse http://localhost:5173 \
  --output=json \
  --output=html \
  --output-path=./deployment/lighthouse-report \
  --chrome-flags="--headless" \
  --only-categories=performance,accessibility,best-practices,seo

echo "========================================================"
echo " Audit completed! HTML Report: ./deployment/lighthouse-report.html"
echo "========================================================"
