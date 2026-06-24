#!/usr/bin/env python3

import subprocess
import json
import re

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
    "Alta" : "Alberta",
    "Atla.": "Alberta",
    "AB": "Alberta",
    "B.C.": "British Columbia",
    "B.C": "British Columbia",
    "BC.": "British Columbia",
    "BC": "British Columbia",
    "Man.": "Manitoba",
    "MB": "Manitoba",
    "N.B.": "New Brunswick",
    "NB": "New Brunswick",
    "N.W.T": "Northwest Territories",
    "NWT.": "Northwest Territories",
    "NT": "Northwest Territories",
    "Ont.": "Ontario",
    "ON": "Ontario",
    "Que.": "Quebec",
    "QC": "Quebec",
    "Sakatchewan": "Saskatchewan",
    "Sask.": "Saskatchewan",
    "Sack.": "Saskatchewan",
    "Sak.": "Saskatchewan",
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
    "WY": "Wyoming",
    "Rus": "Russia",
    "Sui": "Switzerland"
}

int_match = r"^\d+"

drafts = {}

def download(years):
    for year in years:
        if "US" in year:
            year = year.replace(" US", "")
            cmd = ["./grabber.sh", year, "US"]
        else:
            cmd = ["./grabber.sh", year]
        subprocess.run(cmd)

def uniqueness(name, first_or_last):
    print(name, end=" ", flush=True)
    cmd = ["./uniqueness.sh", name.replace(".",""), first_or_last]
    result = subprocess.run(cmd, capture_output=True, text=True)

    try:
        return re.match(int_match, result.stdout.strip()).group()
    except (AttributeError):
        return -1

def interpret(json_file):
    with open(json_file) as json_data:
        data = json.load(json_data)

    draft = json_file.split("/")[1].split(".")[0]
    
    drafts[draft] = {}
    
    for pick in data["draft"]:

        if pick["IsPass"] == True:
            continue

        player = {}

        player["round"] = pick["Round"]
        player["pick"] = pick["DraftOverall"]
        player["team"] = pick["Team"]
        player["first name"] = pick["Player"]["FirstName"]
        player["last name"] = pick["Player"]["LastName"]
        player["full hometown"] = pick["Player"]["HomeTown"]
        try:
            player["home town"] = pick["Player"]["HomeTown"].split(",")[0]
            player["home territory"] = territories[pick["Player"]["HomeTown"].split(",")[1].strip()]
        except AttributeError:
            player["home town"] = None
            player["home territory"] = None
        except KeyError:
            print(player["full hometown"])
            print(territories[pick["Player"]["HomeTown"].split(",")[-1].strip()])
            player["home town"] = None
            player["home territory"] = None
        except IndexError:
            if pick["Player"]["HomeTown"] == "":
                player["home town"] = None
                player["home territory"] = None
            else:
                player["home town"] = pick["Player"]["HomeTown"].rsplit(" ")[0]
                player["home territory"] = territories[pick["Player"]["HomeTown"].rsplit(" ")[-1].strip()]
        player["nationality"] = pick["Player"]["Nationality"]
        player["first name uniqueness rank"] = int(uniqueness(player["first name"], "first"))
        player["last name uniqueness rank"] = int(uniqueness(player["last name"], "last"))
        player["combined uniquness rank"] = player["first name uniqueness rank"] + player["last name uniqueness rank"]
        
        drafts[draft][player["pick"]] = player

def output():
    with open("output.json", "w") as json_file:
        json.dump(drafts, json_file, indent=4)

def main():
    #download(draftyears)
    for year in draftyears:
        print(f"\n\n{year}")
        filename = f"drafts/{year.replace(' ','')}.json"
        interpret(filename)
    output()
    #uniqueness("Coburn", "last")

if __name__ == "__main__":
    main()