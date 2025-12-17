#!/usr/bin/env python3
"""
ComparePower EIA Rate Fetcher
Fetches latest Texas and U.S. electricity rates from EIA.gov API
and calculates all values needed for ComparePower.com shortcodes.
"""

import requests
import json
import csv
import os
from datetime import datetime
from dotenv import load_dotenv
import argparse

# Load environment variables
load_dotenv()

# API Configuration
API_KEY = os.getenv('EIA_API_KEY', '3U1SdIvYnXx3ZGczLrOUjwNLFXRBiPv7h2Bpcb2Z')
BASE_URL = "https://api.eia.gov/v2/electricity/retail-sales/data"


def fetch_eia_data(state_id: str, sector_id: str, num_months: int = 2) -> list:
    """
    Fetch electricity price data from EIA API v2.
    
    Args:
        state_id: State code (e.g., 'TX' for Texas, 'US' for U.S. total)
        sector_id: Sector code ('RES' for residential, 'COM' for commercial)
        num_months: Number of months of data to fetch
    
    Returns:
        List of data points with period and price
    """
    params = {
        "api_key": API_KEY,
        "data[]": "price",
        "facets[stateid][]": state_id,
        "facets[sectorid][]": sector_id,
        "frequency": "monthly",
        "sort[0][column]": "period",
        "sort[0][direction]": "desc",
        "length": num_months
    }
    
    try:
        response = requests.get(BASE_URL, params=params)
        response.raise_for_status()
        data = response.json()
        
        if "response" in data and "data" in data["response"]:
            return data["response"]["data"]
        else:
            print(f"Warning: Unexpected response structure for {state_id}-{sector_id}")
            return []
            
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data for {state_id}-{sector_id}: {e}")
        return []


def get_rate_data() -> dict:
    """
    Fetch all required rate data from EIA API.
    
    Returns:
        Dictionary with current and previous month rates for TX and US
    """
    print("Fetching data from EIA API...")
    
    # Fetch Texas Residential
    tx_res_data = fetch_eia_data("TX", "RES")
    
    # Fetch Texas Commercial
    tx_com_data = fetch_eia_data("TX", "COM")
    
    # Fetch U.S. Residential
    us_res_data = fetch_eia_data("US", "RES")
    
    # Fetch U.S. Commercial
    us_com_data = fetch_eia_data("US", "COM")
    
    # Extract values
    rates = {
        "data_period": tx_res_data[0]["period"] if tx_res_data else "Unknown",
        "prev_period": tx_res_data[1]["period"] if len(tx_res_data) > 1 else "Unknown",
        
        # Texas Residential
        "tx_res_current": float(tx_res_data[0]["price"]) if tx_res_data else 0,
        "tx_res_prev": float(tx_res_data[1]["price"]) if len(tx_res_data) > 1 else 0,
        
        # Texas Commercial
        "tx_com_current": float(tx_com_data[0]["price"]) if tx_com_data else 0,
        "tx_com_prev": float(tx_com_data[1]["price"]) if len(tx_com_data) > 1 else 0,
        
        # U.S. Residential
        "us_res_current": float(us_res_data[0]["price"]) if us_res_data else 0,
        "us_res_prev": float(us_res_data[1]["price"]) if len(us_res_data) > 1 else 0,
        
        # U.S. Commercial
        "us_com_current": float(us_com_data[0]["price"]) if us_com_data else 0,
        "us_com_prev": float(us_com_data[1]["price"]) if len(us_com_data) > 1 else 0,
    }
    
    return rates


def calculate_shortcodes(rates: dict) -> dict:
    """
    Calculate all shortcode values from raw rate data.
    
    Args:
        rates: Dictionary with raw rate values
    
    Returns:
        Dictionary with all calculated shortcode values
    """
    # Extract raw values for easier calculation
    tx_res = rates["tx_res_current"]
    tx_res_prev = rates["tx_res_prev"]
    tx_com = rates["tx_com_current"]
    tx_com_prev = rates["tx_com_prev"]
    us_res = rates["us_res_current"]
    us_res_prev = rates["us_res_prev"]
    us_com = rates["us_com_current"]
    us_com_prev = rates["us_com_prev"]
    
    # Calculate all derived values
    shortcodes = {
        # Metadata
        "month": rates["data_period"],
        "previous_month": rates["prev_period"],
        "updated_date": datetime.now().strftime("%B %Y"),
        
        # === EXISTING SHORTCODES ===
        
        # Texas Residential Current Rate
        "avg_texas_residential_rate": f"{tx_res:.2f} ¢/kWh",
        "avg_texas_residential_rate_value": round(tx_res, 2),
        
        # Texas Residential Previous Month Rate
        "previous_month_avg_texas_residential_rate-copy": f"{tx_res_prev:.2f} ¢/kWh",
        
        # Texas Residential Month-over-Month % Change
        "percent_diff_monthly_resi": f"{((tx_res - tx_res_prev) / tx_res_prev * 100):.2f}%" if tx_res_prev else "N/A",
        
        # Texas Commercial Current Rate
        "avg_commercial_rate_texas": f"{tx_com:.2f} ¢/kWh",
        "avg_commercial_rate_texas_value": round(tx_com, 2),
        
        # Texas Commercial vs U.S. Commercial (% difference)
        "percent_off_us_avg_com": f"{((tx_com - us_com) / us_com * 100):.1f}%" if us_com else "N/A",
        
        # Texas Residential vs U.S. Residential (% difference)
        "percent_off_us_avg": f"{((tx_res - us_res) / us_res * 100):.1f}%" if us_res else "N/A",
        
        # U.S. Residential Current Rate
        "national_avg_rate_residential": f"{us_res:.2f} ¢/kWh",
        "national_avg_rate_residential_value": round(us_res, 2),
        
        # === NEW SHORTCODES ===
        
        # Texas Residential Previous Rate (duplicate for compatibility)
        "tx_res_prev_rate": f"{tx_res_prev:.2f} ¢/kWh",
        
        # Texas Residential Change (absolute)
        "tx_res_change": f"{(tx_res - tx_res_prev):+.2f} ¢/kWh",
        "tx_res_change_value": round(tx_res - tx_res_prev, 2),
        
        # U.S. Residential Previous Rate
        "us_res_prev_rate": f"{us_res_prev:.2f} ¢/kWh",
        
        # U.S. Residential Change (absolute)
        "us_res_change": f"{(us_res - us_res_prev):+.2f} ¢/kWh",
        "us_res_change_value": round(us_res - us_res_prev, 2),
        
        # Texas vs U.S. Residential Difference (absolute)
        "tx_res_vs_us_diff": f"{(tx_res - us_res):.2f} ¢/kWh",
        "tx_res_vs_us_diff_value": round(tx_res - us_res, 2),
        
        # Texas Commercial Previous Rate
        "tx_com_prev_rate": f"{tx_com_prev:.2f} ¢/kWh",
        
        # Texas Commercial Change (absolute)
        "tx_com_change": f"{(tx_com - tx_com_prev):+.2f} ¢/kWh",
        "tx_com_change_value": round(tx_com - tx_com_prev, 2),
        
        # U.S. Commercial Current Rate
        "us_com_rate": f"{us_com:.2f} ¢/kWh",
        "us_com_rate_value": round(us_com, 2),
        
        # U.S. Commercial Previous Rate
        "us_com_prev_rate": f"{us_com_prev:.2f} ¢/kWh",
        
        # U.S. Commercial Change (absolute)
        "us_com_change": f"{(us_com - us_com_prev):+.2f} ¢/kWh",
        "us_com_change_value": round(us_com - us_com_prev, 2),
        
        # Texas vs U.S. Commercial Difference (absolute)
        "tx_com_vs_us_diff": f"{(tx_com - us_com):.2f} ¢/kWh",
        "tx_com_vs_us_diff_value": round(tx_com - us_com, 2),
        
        # === ADDITIONAL USEFUL VALUES ===
        
        # Average monthly bill calculations (based on 1000 kWh usage)
        "average_monthly_bill": f"${(tx_res * 10):.2f}",
        "average_monthly_bill_business": f"${(tx_com * 10):.2f}",
        
        # Dollar format for residential rate
        "avg_texas_residential_rate_dollars": f"${(tx_res / 100):.2f}",
    }
    
    return shortcodes


def print_table(shortcodes: dict):
    """Print shortcode values as a formatted table."""
    print("\n" + "=" * 70)
    print("COMPAREPOWER EIA RATE UPDATE")
    print(f"Data Period: {shortcodes['month']} (Previous: {shortcodes['previous_month']})")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    print("\n📊 EXISTING SHORTCODES (update these in WordPress):\n")
    print(f"{'Shortcode Name':<50} {'Value':<20}")
    print("-" * 70)
    
    existing = [
        "avg_texas_residential_rate",
        "previous_month_avg_texas_residential_rate-copy",
        "percent_diff_monthly_resi",
        "avg_commercial_rate_texas",
        "percent_off_us_avg_com",
        "percent_off_us_avg",
        "national_avg_rate_residential",
    ]
    
    for key in existing:
        if key in shortcodes:
            print(f"{key:<50} {shortcodes[key]:<20}")
    
    print("\n📊 NEW SHORTCODES (create these if needed):\n")
    print(f"{'Shortcode Name':<50} {'Value':<20}")
    print("-" * 70)
    
    new_codes = [
        "tx_res_prev_rate",
        "tx_res_change",
        "us_res_prev_rate",
        "us_res_change",
        "tx_res_vs_us_diff",
        "tx_com_prev_rate",
        "tx_com_change",
        "us_com_rate",
        "us_com_prev_rate",
        "us_com_change",
        "tx_com_vs_us_diff",
    ]
    
    for key in new_codes:
        if key in shortcodes:
            print(f"{key:<50} {shortcodes[key]:<20}")
    
    print("\n📊 CALCULATED BILLS (1000 kWh usage):\n")
    print(f"{'average_monthly_bill':<50} {shortcodes['average_monthly_bill']:<20}")
    print(f"{'average_monthly_bill_business':<50} {shortcodes['average_monthly_bill_business']:<20}")
    print(f"{'avg_texas_residential_rate_dollars':<50} {shortcodes['avg_texas_residential_rate_dollars']:<20}")
    
    print("\n" + "=" * 70)


def save_json(shortcodes: dict, filename: str = "eia_rates.json"):
    """Save shortcode values to JSON file."""
    with open(filename, 'w') as f:
        json.dump(shortcodes, f, indent=2)
    print(f"✅ JSON saved to: {filename}")


def save_csv(shortcodes: dict, filename: str = "eia_rates.csv"):
    """Save shortcode values to CSV file."""
    with open(filename, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["Shortcode Name", "Value"])
        for key, value in shortcodes.items():
            if not key.endswith("_value"):  # Skip raw value duplicates
                writer.writerow([key, value])
    print(f"✅ CSV saved to: {filename}")


def main():
    parser = argparse.ArgumentParser(
        description="Fetch EIA electricity rates and calculate ComparePower shortcode values"
    )
    parser.add_argument(
        "--output", "-o",
        choices=["json", "csv", "table", "all"],
        default="table",
        help="Output format (default: table)"
    )
    parser.add_argument(
        "--filename", "-f",
        default=None,
        help="Output filename (without extension)"
    )
    
    args = parser.parse_args()
    
    # Fetch data from EIA
    rates = get_rate_data()
    
    if rates["tx_res_current"] == 0:
        print("❌ Error: Could not fetch rate data. Check your API key and connection.")
        return
    
    # Calculate all shortcode values
    shortcodes = calculate_shortcodes(rates)
    
    # Output based on format selection
    base_filename = args.filename or f"eia_rates_{shortcodes['month']}"
    
    if args.output in ["table", "all"]:
        print_table(shortcodes)
    
    if args.output in ["json", "all"]:
        save_json(shortcodes, f"{base_filename}.json")
    
    if args.output in ["csv", "all"]:
        save_csv(shortcodes, f"{base_filename}.csv")
    
    print("\n✅ Done! Use these values to update your ComparePower shortcodes.")


if __name__ == "__main__":
    main()

