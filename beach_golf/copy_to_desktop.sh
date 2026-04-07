#!/bin/bash

# Create destination directory if it doesn't exist
mkdir -p ~/Desktop/beach_golf

# Copy js/ directory and game.js to destination
cp -r js/ ~/Desktop/beach_golf/js/
cp game.js ~/Desktop/beach_golf/

echo "Copied js/ and game.js to ~/Desktop/beach_golf/"
