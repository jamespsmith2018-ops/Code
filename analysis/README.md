# Meteor fall-point analysis

`fall_points.py` estimates whether UK Meteor Network meteors could have dropped
meteorites, and where. It reads the daily summary files in the
[`uk-meteor-data`](https://github.com/jamespsmith2018-ops/uk-meteor-data) repo.

```bash
python3 analysis/fall_points.py ../uk-meteor-data/data/summary --month 202605 --shower Cygnid
```

Output goes to `analysis/output/<shower>-<month>.csv` and `.json`, one row per meteor.
Add `--publish` to also merge the results into `public/data/ukmon/fall-points.json`,
which the site shows when **Show modelled landing sites** is ticked in the UK meteors
view. It shows the stony-scenario landing sites, with dashed lines from where each
meteor was last seen.
Requires only Python 3 (standard library).

## Method

Each meteor starts at its observed first point (`_lat1`, `_lng1`, `_H1`), moving
at its observed entry speed (`_vi`) along the straight line to its observed end
point, with its photometric mass (`mass`). The position, velocity and mass are
then integrated (4th-order Runge–Kutta, WGS84 Earth, US Standard Atmosphere 1976)
under the single-body meteor equations:

| Effect               | Equation                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| Drag (deceleration)  | dv/dt = −½ C<sub>d</sub> A ρ<sub>air</sub> v² m<sup>−1/3</sup> ρ<sub>m</sub><sup>−2/3</sup>    |
| Gravity              | g = −GM r / \|r\|³ (inverse-square, towards Earth's centre)                                    |
| Ablation (mass loss) | dm/dt = −σ · ½ C<sub>d</sub> A ρ<sub>air</sub> v³ m<sup>2/3</sup> ρ<sub>m</sub><sup>−2/3</sup> |

A = 1.21 (sphere), C<sub>d</sub> varies with Mach number (0.92 hypersonic to
0.47 subsonic). σ is the ablation coefficient: how much mass the frictional
heating removes per unit of kinetic energy lost. Ablation stops below 3 km/s; the
remaining body then falls in **dark flight** (drag + gravity only) to sea level.

Two material scenarios are run:

| Scenario   | Density ρ<sub>m</sub> | σ            | Meaning                                     |
| ---------- | --------------------- | ------------ | ------------------------------------------- |
| `cometary` | 750 kg/m³             | 0.10 s²/km²  | Realistic for shower meteors (comet dust)   |
| `stony`    | 3500 kg/m³            | 0.014 s²/km² | Optimistic upper bound (as if it were rock) |

For each scenario, the script reports:

- **`*_model_end_height_km`:** where the observed mass is 99.9 % used up. Compare it with
  `observed_end_height_km` to check the model.
- **`*_min_initial_mass_kg`, `*_min_diameter_m`:** the smallest body on the same
  trajectory that would put a ≥ 1 g meteorite on the ground (found by bisection).
- **`*_landing_lat`, `*_landing_lon`:** where that meteorite lands.
- **`*_landing_type`:** `meteorite fall` if it slows to terminal speed in dark flight;
  `hypervelocity impact` if it would still hit at km/s (a crater, or in reality an
  airburst); `none` if no size up to 10⁹ kg lands.

Not modelled: fragmentation (makes survival harder), winds (can move dark-flight
landing points by several km), Earth rotation, terrain height. Landing points are
therefore indicative, roughly ±5–10 km, not search areas.

## Results: Cygnids, May 2026

52 Cygnid meteors were recorded: psi Cygnids (27), May upsilon Cygnids (18),
April rho Cygnids (4) and beta2 Cygnids (3).

- **None of them can have dropped a meteorite.** Their photometric masses are
  0.007–0.2 g (median 0.03 g), and they hit the atmosphere at 39–60 km/s. With
  realistic cometary material, every one burns up between 79 and 100 km. That's
  a median of 7 km below where the cameras lost sight of it, as expected, because
  the cameras lose a meteor before it is completely gone.
- **Even a much larger body wouldn't help.** With cometary material, no size up to
  10⁹ kg (a ~130 m body) on these trajectories delivers anything to the ground.
- **The landing sites are hypothetical.** They come from the optimistic stony
  scenario: if a rocky body had followed the same path, it would need to be about
  **190 kg (0.5 m across)** for the psi Cygnids and **540 kg (0.65 m)** for the
  April rho Cygnids, about 10⁷ times the observed masses, to drop a 1 g meteorite.
  The faster beta2 Cygnids (53 km/s) and May upsilon Cygnids (58 km/s) need
  bodies of 5–50 m. Dark flight starts around 21 km altitude, and the landing
  point is typically 65 km beyond where the meteor was last seen, along its
  direction of travel.
- **46 of 52** give a meteorite-fall landing site, **5** give only a hypervelocity
  impact, and **1** (a 6.6° grazing May upsilon Cygnid) would skip back out to
  space at any size.
