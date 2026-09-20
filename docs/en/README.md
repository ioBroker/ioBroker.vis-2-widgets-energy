# Energy widgets for vis-2

Eight widgets for energy dashboards: an animated energy flow diagram, three charts over history and live values,
a period selector the charts follow, two gauges for self-sufficiency, a battery storage display and an hourly
exchange price chart.

| Widget                                              | What it is for                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| [Distribution](distribution.md)                      | Animated flow diagram: grid, PV, wallbox, heat pump around the house |
| [Consumption](consumption.md)                        | Bar/line chart of one period, read from a history instance           |
| [Consumption comparison](consumption-comparison.md)  | Bar or pie chart that compares live values of several devices        |
| [Interval selector](interval-selector.md)            | Day / week / month / year picker the other widgets follow            |
| [Self-sufficiency](self-sufficiency.md)              | Two ring gauges: self-sufficiency and self-consumption               |
| [Battery storage](battery.md)                        | State of charge, charge/discharge power, remaining time              |
| [Energy costs](energy-costs.md)                      | kWh × price, base fee and feed-in revenue for the shown period       |
| [Dynamic electricity price](dynamic-price.md)        | Hourly exchange prices with the cheapest hours highlighted           |

## Requirements

- **A vis-2 that runs on React 19**, which is 2.20.1 and newer. This widget set is built with React 19, and the
  two have to match: a React 19 vis-2 skips widget sets that were built for React 18 (with a message in the
  log), and a React 18 vis-2 cannot render this one. Update vis-2 together with this adapter.
- A **history instance** (`history`, `sql` or `influxdb`) only for [Consumption](consumption.md) and for
  [Energy costs](energy-costs.md) in the mode "Sum from the history". Everything else works on live values.
  The instance used is the default history instance of the system settings.

## Concepts that come back in several widgets

### Multiplier

Nearly every object ID has a **multiplier** next to it. The widgets do not guess units: a data point in watts
stays in watts. Use the multiplier to bring a data point into the unit the rest of the widget is in — `0.001`
turns W into kW, `1000` turns kW into W, `100` turns euros into cents.

> Since version 2.0.0 the comparison widget no longer converts W to Wh or divides Wh by 1000. If a dashboard
> shows values that are 1000× too large after an update, set the multiplier of the device to `0.001`.

### An object ID that was never set

An `id` field that was never touched does not arrive empty but as the literal string `nothing_selected`. All
widgets treat that as "not configured", so a half-filled configuration does not show a `0`.

### The period

[Consumption](consumption.md) and [Energy costs](energy-costs.md) need a period. There are three ways to give
them one, and they are tried in this order:

1. **A widget** — select an [Interval selector](interval-selector.md) in the attribute *Widget for time interval
   selection*. This is the usual case, and several charts can follow the same selector.
2. **Two object IDs** — *Start OID* holds the beginning as a timestamp, *Interval OID* one of `day`, `week`,
   `month`, `year`. Useful when a script decides the period.
3. **Nothing** — the widget then follows the period of the whole view, which vis-2 keeps for all widgets in it.

### Without frame

Every widget can be drawn without its card (`Without frame`). Use that when the widget sits inside another
widget or on a background that already provides the framing. The title then disappears too.

## Where the values come from

None of these widgets computes energy out of power over time. They show what a data point already contains, so
the numbers are only as good as the adapter behind them. Typical sources in ioBroker:

- inverter adapters (`sma-em`, `fronius`, `e3dc`, `solax`, `growatt`, `modbus`, …) for production, grid and
  battery,
- smart meter adapters (`smartmeter`, `tibberlink`, `shelly` with a 3EM) for grid import and export,
- `tibberlink`, `awattar`, `epex-spot`, `smartenergy` for hourly prices,
- the `statistics` adapter if you need daily/monthly totals as ready-made data points.
