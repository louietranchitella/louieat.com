#!/usr/bin/env python3

import subprocess
import json

draftyears = ["2000", "2001", "2002", "2003", "2004",
              "2005", "2006", "2007", "2008", "2009",
              "2010", "2011", "2012", "2013", "2014",
              "2015", "2016", "2017", "2018", "2019",
              "2020 US", "2020", "2021 US", "2021",
              "2022 US", "2022", "2023 US", "2023",
              "2024 US", "2024", "2025 US", "2025",
              "2026"]

territories = {
    "Alta.": "Alberta",
    "AB": "Alberta",
    "B.C.": "British Columbia",
    "BC": "British Columbia",
    "Man.": "Manitoba",
    "MB": "Manitoba",
    "N.W.T": "Northwest Territories",
    "NT": "Northwest Territories",
    "Sask.": "Saskatchewan",
    "SK": "Saskatchewan",
    "Yukon": "Yukon",
    "YT": "Yukon",
    "AL": "Alabama",
    "AK": "Alaska",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "FL": "Florida",
    "GA": "Georgia",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming"
}

drafts = {}

def download(years):
    for year in years:
        if "US" in year:
            year = year.replace(" US", "")
            cmd = ["./grabber.sh", year, "US"]
        else:
            cmd = ["./grabber.sh", year]
        subprocess.run(cmd)

def interpret(json_file):
    with open(json_file) as json_data:
        data = json.load(json_data)

    draft = json_file.split("/")[1].split(".")[0]

    player = {}
    
    for pick in data["draft"]:
        player["round"] = pick["Round"]
        player["pick"] = pick["DraftOverall"]
        player["team"] = pick["Team"]
        player["first name"] = pick["FirstName"]
        player["last name"] = pick["LastName"]
        player["full hometown"] = pick["HomeTown"]
        player["home town"] = pick["HomeTown"].split(",")[0]
        player["home territory"] = territories[pick["HomeTown"].split(",")[1].strip()]
        player["nationality"] = pick["Nationality"]

def main():
    #download(draftyears)
    interpret("drafts/2000.json")

if __name__ == "__main__":
    main()