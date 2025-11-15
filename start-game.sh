#!/bin/bash

echo "Starting game server..."
echo ""

cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    echo "Please wait (1-2 minutes)"
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "Installation failed! Check Node.js is installed."
        read -p "Press any key to exit..."
        exit 1
    fi
    echo ""
    echo "Installation complete!"
    echo ""
fi

echo "Open browser: http://localhost:5173"
echo "For iPad/Phone, use Network address shown below"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

sleep 2

# Open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:5173
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:5173 2>/dev/null || echo "Open manually: http://localhost:5173"
fi

npm run dev
