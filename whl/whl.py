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

int_match = r"^\d+"

drafts = {}
territories = {}
firstnames = {}
lastnames = {}

def init():
    with open("territories.json") as json_data:
        globals()["territories"] = json.load(json_data)
    with open("firstnames.json") as json_data:
        globals()["firstnames"] = json.load(json_data)
    with open("lastnames.json") as json_data:
        globals()["lastnames"] = json.load(json_data)

def download(years=draftyears):
    for year in years:
        cmd = year.split(" ")
        cmd.insert(0, "./grabber.sh")
        subprocess.run(cmd)

    subprocess.run(['curl -o firstnames.json -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -L "https://howmanyofmes.com/data/first-names.json"'])
    subprocess.run(['curl -o lastnames.json -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -L "https://howmanyofmes.com/data/last-names.json"'])


def uniqueness(name, first_or_last):
    print(name, end=" ", flush=True)
    cmd = ["./uniqueness.sh", name.replace(".",""), first_or_last]
    result = subprocess.run(cmd, capture_output=True, text=True)

    try:
        return re.match(int_match, result.stdout.strip()).group()
    except (AttributeError):
        return -1

def firstname_uniqueness(name):
    try:
        return firstnames[name.lower()]["t"]
    except KeyError:
        return uniqueness(name, "first")

def lastname_uniqueness(name):
    try:
        return lastnames[name.lower()]
    except KeyError:
        return uniqueness(name, "last")

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
        player["first name uniqueness rank"] = int(firstname_uniqueness(player["first name"]))
        player["last name uniqueness rank"] = int(lastname_uniqueness(player["last name"]))
        player["combined uniquness rank"] = player["first name uniqueness rank"] + player["last name uniqueness rank"]
        
        drafts[draft][player["pick"]] = player

def output():
    with open("output.json", "w") as json_data:
        json.dump(drafts, json_data, indent=4)

def main():

    init()
#    print(firstnames)
#    download()
    for year in draftyears:
        print(f"\n\n{year}")
        filename = f"drafts/{year.replace(' ','')}.json"
        interpret(filename)
    output()

if __name__ == "__main__":
    main()