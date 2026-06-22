#!/usr/bin/env python3

import subprocess

draftyears = ["2000", "2001", "2002", "2003", "2004",
              "2005", "2006", "2007", "2008", "2009",
              "2010", "2011", "2012", "2013", "2014",
              "2015", "2016", "2017", "2018", "2019",
              "2020 US", "2020", "2021 US", "2021",
              "2022 US", "2022", "2023 US", "2023",
              "2024 US", "2024", "2025 US", "2025", 
              "2026"]

for year in draftyears:
    if "US" in year:
        year = year.replace(" US", "")
        cmd = ["./grabber.sh", year, "US"]
    else:
        cmd = ["./grabber.sh", year]
    subprocess.run(cmd)