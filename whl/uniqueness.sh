#!/bin/bash

# Check if at least one argument was passed
if [ $# -eq 0 ]; then
    echo "Error: No arguments provided."
    echo "Usage: $0 [name] [first_or_last]"
    exit 1
fi

if [ $# -gt 2 ]; then
    echo "Error: Too many arguments provided."
    echo "Usage: $0 [name] [first_or_last]"
    exit 1
fi

# Save the first argument as name
NAME="$1"
LOWERCASE=$(echo "$NAME" | tr '[:upper:]' '[:lower:]')

# Save the second argument as first or last name
FIRST_OR_LAST=$(echo "$2" | tr '[:upper:]' '[:lower:]')

# Check if first or last name
if [ $2 == "first" ]; then
    SUBURL="x/forenames"
elif [ $2 == "last" ]; then
    SUBURL="surnames"
else
    echo "Error: Invalid argument for [first_or_last]."
    echo "Usage: $0 [name] [first_or_last]"
    exit 1
fi

# Download the HTML page of whl draft for the specified year
curl -o $LOWERCASE.uniqueness.html -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -L "https://forebears.io/$SUBURL/$LOWERCASE/"

# Extract the uniqueness from the HTML
UNIQUENESS=$(grep -oP '(?<=statistic-number">)[^\]]+(?=<sup)' $LOWERCASE.uniqueness.html)

# Clean up the HTML file
rm $LOWERCASE.uniqueness.html

echo "${UNIQUENESS//,/}"