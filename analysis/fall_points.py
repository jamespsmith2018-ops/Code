#!/usr/bin/env python3
"""Estimate where UK Meteor Network meteors could have dropped meteorites.

For each meteor this integrates the single-body meteor equations along the
measured trajectory:

    dv/dt = -1/2 Cd A rho_air v^2 m^(-1/3) rho_m^(-2/3) * v_hat  +  g      (drag + gravity)
    dm/dt = -sigma * 1/2 Cd A rho_air v^3 m^(2/3) rho_m^(-2/3)            (ablation)

starting at the observed first point with the observed entry speed and
photometric mass. Ablation stops below 3 km/s; from then on the body is in
"dark flight" (drag + gravity only) until it reaches the ground (sea level).

Two questions are answered per meteor:

1. Burn-out: with the observed mass, where does the model say the meteoroid is
   used up (99.9 % of its mass gone)? Compared with the observed end height,
   this checks that the model and material parameters are sensible.
2. Possible landing site: the smallest initial mass on the same trajectory that
   would leave a >= 1 g meteorite on the ground, and where that meteorite lands.

Two material scenarios are run:
    cometary  rho_m = 750 kg/m3, sigma = 0.10 s2/km2  (realistic for shower meteors)
    stony     rho_m = 3500 kg/m3, sigma = 0.014 s2/km2 (optimistic upper bound)

Not modelled: fragmentation (makes survival harder), winds (can shift dark
flight by several km), Earth rotation / Coriolis, terrain height.

    python analysis/fall_points.py ../uk-meteor-data/data/summary --month 202605 --shower Cygnid
"""

import argparse
import csv
import glob
import json
import math
import os
from concurrent.futures import ProcessPoolExecutor

# ---------------------------------------------------------------- Earth model

WGS84_A = 6378137.0
WGS84_F = 1 / 298.257223563
WGS84_B = WGS84_A * (1 - WGS84_F)
E2 = WGS84_F * (2 - WGS84_F)
EP2 = (WGS84_A**2 - WGS84_B**2) / WGS84_B**2
GM = 3.986004418e14


def geodetic_to_ecef(lat_deg, lon_deg, h_m):
    lat, lon = math.radians(lat_deg), math.radians(lon_deg)
    n = WGS84_A / math.sqrt(1 - E2 * math.sin(lat) ** 2)
    return (
        (n + h_m) * math.cos(lat) * math.cos(lon),
        (n + h_m) * math.cos(lat) * math.sin(lon),
        (n * (1 - E2) + h_m) * math.sin(lat),
    )


def ecef_to_geodetic(x, y, z):
    """Bowring's method; sub-metre accuracy at these heights."""
    p = math.hypot(x, y)
    th = math.atan2(z * WGS84_A, p * WGS84_B)
    lat = math.atan2(z + EP2 * WGS84_B * math.sin(th) ** 3, p - E2 * WGS84_A * math.cos(th) ** 3)
    n = WGS84_A / math.sqrt(1 - E2 * math.sin(lat) ** 2)
    return math.degrees(lat), math.degrees(math.atan2(y, x)), p / math.cos(lat) - n


# --------------------------------------------- atmosphere (US Standard 1976)

# height km, density kg/m3, temperature K
_ATM = [
    (0, 1.225, 288.15), (5, 7.364e-1, 255.68), (10, 4.135e-1, 223.25),
    (15, 1.948e-1, 216.65), (20, 8.891e-2, 216.65), (25, 4.008e-2, 221.55),
    (30, 1.841e-2, 226.51), (40, 3.996e-3, 250.35), (50, 1.027e-3, 270.65),
    (60, 3.097e-4, 247.02), (70, 8.283e-5, 219.59), (80, 1.846e-5, 198.64),
    (90, 3.416e-6, 186.87), (100, 5.604e-7, 195.08), (110, 9.708e-8, 240.0),
    (120, 2.222e-8, 360.0), (150, 2.076e-9, 634.0), (200, 2.541e-10, 854.0),
]


def atmosphere(h_m):
    """Returns (density kg/m3, speed of sound m/s) at geometric height h."""
    h = max(0.0, h_m / 1000)
    if h >= _ATM[-1][0]:
        return 0.0, 600.0
    for (h0, r0, t0), (h1, r1, t1) in zip(_ATM, _ATM[1:]):
        if h < h1:
            f = (h - h0) / (h1 - h0)
            rho = math.exp(math.log(r0) + f * (math.log(r1) - math.log(r0)))
            temp = t0 + f * (t1 - t0)
            return rho, math.sqrt(1.4 * 287.05 * temp)


def drag_coefficient(mach):
    """Sphere drag coefficient vs Mach number (simple piecewise fit)."""
    if mach < 0.6:
        return 0.47
    if mach < 1.0:
        return 0.47 + (mach - 0.6) / 0.4 * (0.95 - 0.47)
    if mach < 1.5:
        return 0.95 + (mach - 1.0) / 0.5 * (1.05 - 0.95)
    if mach < 3.0:
        return 1.05 - (mach - 1.5) / 1.5 * (1.05 - 0.92)
    return 0.92


# ----------------------------------------------------------------- dynamics

SHAPE_A = 1.21          # sphere: S = A (m / rho_m)^(2/3)
ABLATION_CUTOFF = 3000  # m/s: below this the body no longer ablates
SCENARIOS = {
    'cometary': {'rho_m': 750.0, 'sigma': 0.10e-6},   # sigma in s2/m2
    'stony': {'rho_m': 3500.0, 'sigma': 0.014e-6},
}


def derivatives(state, rho_m, sigma):
    x, y, z, vx, vy, vz, m = state
    _, _, h = ecef_to_geodetic(x, y, z)
    rho_a, c_sound = atmosphere(h)
    v = math.sqrt(vx * vx + vy * vy + vz * vz)
    r3 = (x * x + y * y + z * z) ** 1.5
    gx, gy, gz = -GM * x / r3, -GM * y / r3, -GM * z / r3
    if m <= 0 or v == 0:
        return (vx, vy, vz, gx, gy, gz, 0.0), h
    k = 0.5 * drag_coefficient(v / c_sound) * SHAPE_A * rho_a * (m / rho_m) ** (2 / 3)  # 1/2 Cd S rho_a
    decel = k * v * v / m
    dm = -sigma * k * v**3 if v > ABLATION_CUTOFF else 0.0
    return (vx, vy, vz, gx - decel * vx / v, gy - decel * vy / v, gz - decel * vz / v, dm), h


def fly(start, velocity, m0, scenario, stop_mass):
    """Integrates until the ground or until mass < stop_mass.

    Returns dict(outcome='ground'|'consumed'|'escaped', lat, lon, h, mass, speed,
    dark_flight_km) where dark_flight_km is the height at which ablation stopped.
    'escaped' means a grazing body climbed back out of the atmosphere.
    """
    rho_m, sigma = scenario['rho_m'], scenario['sigma']
    state = (*start, *velocity, m0)
    dark_h = None
    t = 0.0
    while t < 2000:
        d, h = derivatives(state, rho_m, sigma)
        v = math.sqrt(state[3] ** 2 + state[4] ** 2 + state[5] ** 2)
        if dark_h is None and v <= ABLATION_CUTOFF:
            dark_h = h
        # step: at most ~150 m of travel, 2 % of mass, 0.5 s
        dt = min(0.5, 150 / max(v, 1.0))
        if d[6] < 0:
            dt = min(dt, 0.02 * state[6] / -d[6])
        dt = max(dt, 1e-5)

        k1 = d
        k2, _ = derivatives(tuple(s + 0.5 * dt * k for s, k in zip(state, k1)), rho_m, sigma)
        k3, _ = derivatives(tuple(s + 0.5 * dt * k for s, k in zip(state, k2)), rho_m, sigma)
        k4, _ = derivatives(tuple(s + dt * k for s, k in zip(state, k3)), rho_m, sigma)
        new = tuple(
            s + dt / 6 * (a + 2 * b + 2 * c + e) for s, a, b, c, e in zip(state, k1, k2, k3, k4)
        )
        t += dt
        lat, lon, h_new = ecef_to_geodetic(*new[:3])

        if new[6] < stop_mass:
            return {'outcome': 'consumed', 'lat': lat, 'lon': lon, 'h': h_new, 'mass': 0.0,
                    'speed': v, 'dark_flight_km': None}
        if h_new <= 0:
            # interpolate to the ground crossing
            f = h / (h - h_new) if h != h_new else 1.0
            pos = [a + f * (b - a) for a, b in zip(state[:3], new[:3])]
            lat, lon, _ = ecef_to_geodetic(*pos)
            speed = math.sqrt(sum(c * c for c in new[3:6]))
            return {'outcome': 'ground', 'lat': lat, 'lon': lon, 'h': 0.0, 'mass': new[6],
                    'speed': speed, 'dark_flight_km': None if dark_h is None else dark_h / 1000}
        if h_new > 150_000 and new[6] > 0:
            return {'outcome': 'escaped', 'lat': lat, 'lon': lon, 'h': h_new, 'mass': new[6],
                    'speed': v, 'dark_flight_km': None}
        state = new
    raise RuntimeError('integration did not finish')


# ------------------------------------------------------------ per meteor

MIN_METEORITE = 1e-3  # kg: a 1 g meteorite counts as "something landed"


def initial_conditions(ev):
    start = geodetic_to_ecef(ev['_lat1'], ev['_lng1'], ev['_H1'] * 1000)
    end = geodetic_to_ecef(ev['_lat2'], ev['_lng2'], ev['_H2'] * 1000)
    d = [b - a for a, b in zip(start, end)]
    length = math.sqrt(sum(c * c for c in d))
    u = [c / length for c in d]
    v0 = ev['_vi'] * 1000
    # entry angle above the horizon at the start point
    up = [c / math.sqrt(sum(s * s for s in start)) for c in start]
    entry = math.degrees(math.asin(-sum(a * b for a, b in zip(u, up))))
    return start, [c * v0 for c in u], entry, length / 1000


def survives(start, vel, m0, scenario):
    r = fly(start, vel, m0, scenario, stop_mass=MIN_METEORITE)
    return r if r['outcome'] == 'ground' and r['mass'] >= MIN_METEORITE else None


def min_surviving_mass(start, vel, scenario, lo, hi=1e9):
    """Bisection (in log mass) for the smallest initial mass that lands >= 1 g."""
    if survives(start, vel, hi, scenario) is None:
        return None, None
    best = None
    if survives(start, vel, lo, scenario):
        return lo, survives(start, vel, lo, scenario)
    llo, lhi = math.log10(lo), math.log10(hi)
    while lhi - llo > 0.02:  # ~5 % in mass
        mid = 0.5 * (llo + lhi)
        r = survives(start, vel, 10**mid, scenario)
        if r:
            lhi, best = mid, r
        else:
            llo = mid
    return 10**lhi, best or survives(start, vel, 10**lhi, scenario)


def analyse(ev):
    start, vel, entry, length_km = initial_conditions(ev)
    m_obs = float(ev['mass'])
    row = {
        'id': ev['orbname'],
        'shower': ev['name'].strip(),
        'code': ev['_stream'],
        'time_utc': ev['_localtime'].strip('_'),
        'magnitude': ev['_mag'],
        'observed_mass_g': round(m_obs * 1000, 4),
        'entry_speed_km_s': round(ev['_vi'], 2),
        'entry_angle_deg': round(entry, 1),
        'start_lat': ev['_lat1'], 'start_lon': ev['_lng1'], 'start_height_km': round(ev['_H1'], 2),
        'end_lat': ev['_lat2'], 'end_lon': ev['_lng2'], 'observed_end_height_km': round(ev['_H2'], 2),
        'observed_length_km': round(length_km, 2),
        'cameras': ev['numstats'],
    }
    for name, sc in SCENARIOS.items():
        burn = fly(start, vel, m_obs, sc, stop_mass=1e-3 * m_obs)
        row[f'{name}_model_end_height_km'] = round(burn['h'] / 1000, 2) if burn['outcome'] == 'consumed' else None
        row[f'{name}_observed_mass_survives'] = burn['outcome'] == 'ground' and burn['mass'] >= MIN_METEORITE
        m_min, landing = min_surviving_mass(start, vel, sc, lo=m_obs)
        if landing:
            row[f'{name}_min_initial_mass_kg'] = float(f'{m_min:.3g}')
            row[f'{name}_min_diameter_m'] = round((6 * m_min / (math.pi * sc['rho_m'])) ** (1 / 3), 2)
            # A true meteorite fall slows to terminal speed (tens of m/s) in dark
            # flight; anything much faster is a hypervelocity (cratering) impact,
            # where a single-body model is unreliable (it would really fragment).
            row[f'{name}_landing_type'] = 'meteorite fall' if landing['speed'] < 150 else 'hypervelocity impact'
            row[f'{name}_landing_lat'] = round(landing['lat'], 5)
            row[f'{name}_landing_lon'] = round(landing['lon'], 5)
            row[f'{name}_landed_mass_g'] = round(landing['mass'] * 1000, 1)
            row[f'{name}_impact_speed_m_s'] = round(landing['speed'], 1)
            row[f'{name}_dark_flight_start_km'] = (
                None if landing['dark_flight_km'] is None else round(landing['dark_flight_km'], 1)
            )
        else:
            row[f'{name}_landing_type'] = 'none (burns up or skips out at any size)'
            for k in ('min_initial_mass_kg', 'min_diameter_m', 'landing_lat', 'landing_lon',
                      'landed_mass_g', 'impact_speed_m_s', 'dark_flight_start_km'):
                row[f'{name}_{k}'] = None
    return row


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('summary_dir', help='folder of UKMON daily summary files (YYYY/YYYYMMDD.json)')
    p.add_argument('--month', required=True, help='YYYYMM')
    p.add_argument('--shower', default='', help='substring of the shower name, e.g. "Cygnid"')
    p.add_argument('--out', default=os.path.join(os.path.dirname(__file__), 'output'))
    args = p.parse_args()

    files = sorted(glob.glob(os.path.join(args.summary_dir, args.month[:4], f'{args.month}*.json')))
    events = [e for f in files for e in json.load(open(f))]
    events = [e for e in events if args.shower.lower() in e['name'].lower()]
    print(f'{len(events)} meteors from {len(files)} days')

    with ProcessPoolExecutor() as pool:
        rows = sorted(pool.map(analyse, events), key=lambda r: r['id'])

    os.makedirs(args.out, exist_ok=True)
    stem = os.path.join(args.out, f"{(args.shower or 'all').lower()}-{args.month}")
    with open(stem + '.csv', 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]), lineterminator='\n')
        w.writeheader()
        w.writerows(rows)
    with open(stem + '.json', 'w') as f:
        json.dump(rows, f, indent=1)
    print(f'wrote {stem}.csv and .json')


if __name__ == '__main__':
    main()
