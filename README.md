# ComparePower EIA Rate Fetcher

Automatically fetch and calculate Texas electricity rate data from [EIA.gov](https://www.eia.gov/) for updating ComparePower.com shortcodes.

## Quick Start

```bash
# Create virtual environment (first time only)
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Run the fetcher (shows table output)
python fetch_eia_rates.py

# Export to JSON
python fetch_eia_rates.py --output json

# Export to CSV
python fetch_eia_rates.py --output csv

# Export all formats
python fetch_eia_rates.py --output all
```

## Daily Usage

After initial setup, just run:

```bash
cd /Users/mbp-ez/Documents/Apps/eia
source venv/bin/activate
python fetch_eia_rates.py
```

## What It Does

1. **Fetches** the latest monthly electricity prices from EIA's API:
   - Texas Residential (`ELEC.PRICE.TX-RES.M`)
   - Texas Commercial (`ELEC.PRICE.TX-COM.M`)
   - U.S. Residential (`ELEC.PRICE.US-RES.M`)
   - U.S. Commercial (`ELEC.PRICE.US-COM.M`)

2. **Calculates** all shortcode values:
   - Current and previous month rates
   - Month-over-month changes (absolute and %)
   - Texas vs. U.S. differences
   - Average monthly bills

3. **Outputs** formatted data ready for WordPress shortcodes

## Shortcodes Generated

### Existing (Update in WordPress)
| Shortcode | Description |
|-----------|-------------|
| `avg_texas_residential_rate` | TX residential avg (¢/kWh) |
| `previous_month_avg_texas_residential_rate-copy` | TX residential prev month |
| `percent_diff_monthly_resi` | TX residential month-over-month % |
| `avg_commercial_rate_texas` | TX commercial avg (¢/kWh) |
| `percent_off_us_avg_com` | TX commercial vs US % diff |
| `percent_off_us_avg` | TX residential vs US % diff |
| `national_avg_rate_residential` | US residential avg (¢/kWh) |

### New (Create if needed)
| Shortcode | Description |
|-----------|-------------|
| `tx_res_prev_rate` | TX residential previous month |
| `tx_res_change` | TX residential change (¢/kWh) |
| `tx_res_vs_us_diff` | TX vs US residential diff |
| `tx_com_prev_rate` | TX commercial previous month |
| `tx_com_change` | TX commercial change (¢/kWh) |
| `us_com_rate` | US commercial avg (¢/kWh) |
| `us_com_prev_rate` | US commercial previous month |
| `us_com_change` | US commercial change (¢/kWh) |
| `tx_com_vs_us_diff` | TX vs US commercial diff |

## Configuration

Your API key is stored in `.env`:

```
EIA_API_KEY=your_key_here
```

## Data Notes

- EIA data is typically **2 months behind** (e.g., July data publishes in late August)
- The Electric Power Monthly is updated around the 26th of each month
- All prices are in **cents per kWh**

## Example Output

```
======================================================================
COMPAREPOWER EIA RATE UPDATE
Data Period: 2025-06 (Previous: 2025-05)
Generated: 2025-08-18 14:30:00
======================================================================

📊 EXISTING SHORTCODES (update these in WordPress):

Shortcode Name                                     Value               
----------------------------------------------------------------------
avg_texas_residential_rate                         15.23 ¢/kWh         
previous_month_avg_texas_residential_rate-copy     15.49 ¢/kWh         
percent_diff_monthly_resi                          -1.68%              
avg_commercial_rate_texas                          8.60 ¢/kWh          
percent_off_us_avg_com                             -36.9%              
percent_off_us_avg                                 -12.8%              
national_avg_rate_residential                      17.47 ¢/kWh         
```

