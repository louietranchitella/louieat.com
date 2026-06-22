#!/bin/bash

# Check if at least one argument was passed
if [ $# -eq 0 ]; then
    echo "Error: No arguments provided."
    echo "Usage: $0 [year] [draft_type=whl]"
    exit 1
fi

if [ $# -gt 2 ]; then
    echo "Error: Too many arguments provided."
    echo "Usage: $0 [year] [draft_type=whl]"
    exit 1
fi

# Save the first argument as YEAR for url value
YEAR="$1"
# Save the second argument as NAME for file name
NAME="$1"

# Check if US Priority draft
if [ $2 == "US" ]; then
    DRAFT="whl_us"
    NAME+="US"
else
    DRAFT="whl"
fi

# Download the HTML page of whl draft for the specified year
curl -o drafts/$NAME.html https://chl.ca/whl/draft/$DRAFT/$YEAR/

# Extract the draft data from the HTML and save it in a JSON file
echo "{\"draft\": [" > drafts/$NAME.json
grep -oP '(?<=draft\"\:\[)[^\]]+(?=\])' drafts/$NAME.html >> drafts/$NAME.json
echo "]}" >> drafts/$NAME.json

# Format the JSON file using jq
jq . drafts/$NAME.json > drafts/tmp$NAME.json && mv drafts/tmp$NAME.json drafts/$NAME.json

# Clean up the HTML file
rm drafts/$NAME.html