# Energie-Widgets für vis-2

Acht Widgets für Energie-Dashboards: ein animiertes Energieflussdiagramm, drei Diagramme über History- und
Live-Werte, eine Zeitraumauswahl, der die Diagramme folgen, zwei Ringe für Autarkie und Eigenverbrauch, eine
Batteriespeicher-Anzeige und ein Diagramm der stündlichen Börsenpreise.

| Widget                                             | Wofür                                                                |
| -------------------------------------------------- | --------------------------------------------------------------------- |
| [Verteilung](distribution.md)                       | Animiertes Flussdiagramm: Netz, PV, Wallbox, Wärmepumpe um das Haus    |
| [Verbrauch](consumption.md)                         | Balken-/Liniendiagramm eines Zeitraums aus einer History-Instanz       |
| [Verbrauchsvergleich](consumption-comparison.md)    | Balken- oder Kuchendiagramm mit Live-Werten mehrerer Geräte            |
| [Intervallwähler](interval-selector.md)             | Tag / Woche / Monat / Jahr, dem die anderen Widgets folgen             |
| [Autarkie](self-sufficiency.md)                     | Zwei Ringe: Autarkiegrad und Eigenverbrauch                            |
| [Batteriespeicher](battery.md)                      | Ladezustand, Lade-/Entladeleistung, Restlaufzeit                       |
| [Energiekosten](energy-costs.md)                    | kWh × Preis, Grundgebühr und Einspeisevergütung des Zeitraums          |
| [Dynamischer Strompreis](dynamic-price.md)          | Stündliche Börsenpreise mit hervorgehobenen günstigsten Stunden        |

## Voraussetzungen

- **Ein vis-2, das auf React 19 läuft**, also 2.20.1 oder neuer. Dieses Widget-Set ist mit React 19 gebaut, und
  beide müssen zusammenpassen: ein vis-2 auf React 19 überspringt Widget-Sets, die für React 18 gebaut wurden
  (mit einer Meldung im Log), und ein vis-2 auf React 18 kann dieses hier nicht darstellen. Aktualisieren Sie
  vis-2 zusammen mit diesem Adapter.
- Eine **History-Instanz** (`history`, `sql` oder `influxdb`) nur für [Verbrauch](consumption.md) und für
  [Energiekosten](energy-costs.md) im Modus „Summe aus der History“. Alles andere arbeitet mit Live-Werten.
  Verwendet wird die Standard-History-Instanz aus den Systemeinstellungen.

## Begriffe, die in mehreren Widgets vorkommen

### Multiplikator

Fast jede Objekt-ID hat einen **Multiplikator** daneben. Die Widgets raten keine Einheiten: ein Datenpunkt in
Watt bleibt in Watt. Mit dem Multiplikator bringen Sie einen Datenpunkt in die Einheit, in der der Rest des
Widgets rechnet — `0.001` macht aus W ein kW, `1000` aus kW ein W, `100` aus Euro Cent.

> Seit Version 2.0.0 rechnet das Vergleichs-Widget W nicht mehr in Wh um und dividiert Wh nicht mehr durch
> 1000. Zeigt ein Dashboard nach einem Update 1000-fach zu große Werte, setzen Sie den Multiplikator des
> Geräts auf `0.001`.

### Eine nie gesetzte Objekt-ID

Ein `id`-Feld, das nie angefasst wurde, kommt nicht leer an, sondern als Zeichenkette `nothing_selected`. Alle
Widgets behandeln das als „nicht konfiguriert“, damit eine halb ausgefüllte Konfiguration keine `0` anzeigt.

### Der Zeitraum

[Verbrauch](consumption.md) und [Energiekosten](energy-costs.md) brauchen einen Zeitraum. Es gibt drei Wege,
ihnen einen zu geben, und sie werden in dieser Reihenfolge versucht:

1. **Ein Widget** — im Attribut *Widget zur Zeitintervallauswahl* einen
   [Intervallwähler](interval-selector.md) auswählen. Das ist der Normalfall, und mehrere Diagramme können
   demselben Wähler folgen.
2. **Zwei Objekt-IDs** — *OID starten* enthält den Beginn als Zeitstempel, *Intervall-OID* eines von `day`,
   `week`, `month`, `year`. Praktisch, wenn ein Skript den Zeitraum bestimmt.
3. **Nichts** — dann folgt das Widget dem Zeitraum der ganzen Ansicht, den vis-2 für alle Widgets darin führt.

### Ohne Rahmen

Jedes Widget lässt sich ohne Karte zeichnen (`Ohne Rahmen`). Sinnvoll, wenn das Widget in einem anderen Widget
steckt oder auf einem Hintergrund liegt, der die Einfassung schon mitbringt. Der Titel entfällt dann ebenfalls.

## Woher die Werte kommen

Keines dieser Widgets rechnet Energie aus Leistung über die Zeit. Sie zeigen, was ein Datenpunkt bereits
enthält — die Zahlen sind also nur so gut wie der Adapter dahinter. Typische Quellen in ioBroker:

- Wechselrichter-Adapter (`sma-em`, `fronius`, `e3dc`, `solax`, `growatt`, `modbus`, …) für Erzeugung, Netz und
  Batterie,
- Zähler-Adapter (`smartmeter`, `tibberlink`, `shelly` mit einem 3EM) für Netzbezug und Einspeisung,
- `tibberlink`, `awattar`, `epex-spot`, `smartenergy` für Stundenpreise,
- der `statistics`-Adapter, wenn Sie Tages- oder Monatssummen als fertige Datenpunkte brauchen.
